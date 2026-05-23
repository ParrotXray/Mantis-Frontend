# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # HTTP dev server (Next.js fast refresh)
npm run build        # Static export build (outputs to /out)
npm run start        # Serve the static export
npm run lint         # ESLint

npm run dev:https    # HTTPS dev via custom server.js (requires ssl/ certs)
npm run start:https  # HTTPS production via custom server.js
```

No test suite exists in this project.

For HTTPS modes, SSL certificates must exist at `ssl/root.ca-bundle`, `ssl/server.crt`, and `ssl/server.key`.

## Architecture

### Backend connection

All backend endpoints are configured in `src/config.ts`. The target host defaults to `192.168.1.3:8080`. Change `hostname` and `port` there to point at a different backend. All page-level API/WS URLs are derived from that single file.

### Data flow: WebSockets + RxJS

`WebSocketProvider` (`src/providers/WebSocketProvider.tsx`) is the central hub. On mount it eagerly opens **all** WebSocket connections at once — 24 flow-stats streams (2 IP versions × 2 directions × 2 flow types × 3 time ranges) plus one system-health stream and one detection-alert stream. Each connection is wrapped in a RxJS `BehaviorSubject` and exposed as a shared observable via `getIPv4FlowStream()`, `getIPv6FlowStream()`, `getDetectionAlertStream()`, and `getSystemHealthStream()`.

Pages subscribe to the relevant streams using RxJS operators (`combineLatest`, `map`, `catchError`). Closing the provider unsubscribes observables but intentionally **does not close** the underlying WebSocket connections (they are shared).

`bootTime` — fetched once via HTTP at startup and held in `WebSocketProvider` — is required for interpreting flow timestamps, which are nanoseconds since system boot. Pages read it via `useContext(WebsocketContext).bootTime`.

The `isPausedRef` pattern appears throughout: a `useRef` mirrors the `isPaused` state so that WS subscription callbacks can read the current pause state without the subscription itself being torn down and re-created on every pause toggle.

### Providers tree

```
ErrorBoundary
  ThemeProvider        → actualTheme ('light'|'dark'), persisted to localStorage
    WebSocketProvider  → all WS streams + bootTime
      AccessControlProvider  → cached fetch layer for IP allow/block lists
        <Page>
```

### AccessControlProvider caching

`AccessControlProvider` (`src/providers/AccessControlProvider.tsx`) caches REST responses for the IP access-control lists with a 10-minute TTL. It deduplicates concurrent requests for the same key using a `pendingRequests` ref. The cache is keyed as `ipv4_black_list`, `ipv4_white_list`, `ipv6_black_list`, `ipv6_white_list`. IPv4 blacklist is preloaded on mount. Expired entries are purged every 5 minutes (entries older than 30 minutes are dropped).

### Static export caveat

`next.config.js` sets `output: 'export'`, meaning `npm run build` produces a fully static site in `/out`. Next.js API routes are therefore not available — all data comes from the external backend at the configured host.

### Styling

Tailwind CSS v4. Dark/light mode is managed entirely through `ThemeProvider`; components read `isDark = actualTheme === 'dark'` and apply conditional class strings inline. There are no CSS modules.

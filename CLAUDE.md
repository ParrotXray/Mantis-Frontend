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
        RestartProvider      → shared POST /system/restart trigger + poll status
          getLayout(<Page>)  → per-page Layout wrapper, applied here so Sidebar persists
```

### Persistent layout (`getLayout`)

Every page exports a `NextPageWithLayout` (`src/types/NextPageWithLayout.ts`) and sets
`Page.getLayout = (page) => <Layout>{page}</Layout>` instead of wrapping its own JSX in `<Layout>`.
`_app.tsx` calls `Component.getLayout ?? ((page) => page)` around `<Component {...pageProps} />`, so
`Layout`/`Sidebar` sit at a fixed position in the tree across every route change instead of being created
fresh inside each page's render. Without this, Next's Pages Router fully unmounts and remounts the
previous page's `<Layout>` on every navigation (verified via DOM node identity before this existed) —
Sidebar's local state (collapsed, mobile drawer, theme picker) would reset and its `motion.aside` would
re-run its mount lifecycle on every click, which read as the sidebar "bouncing" when switching nav items.
A page with multiple return paths (loading/error/loaded) no longer wraps each one in `<Layout>` — only
the innermost content differs; `getLayout` supplies the wrapper once, after the component definition.

### AccessControlProvider caching

`AccessControlProvider` (`src/providers/AccessControlProvider.tsx`) caches REST responses for the IP access-control lists with a 10-minute TTL. It deduplicates concurrent requests for the same key using a `pendingRequests` ref. The cache is keyed as `ipv4_black_list`, `ipv4_white_list`, `ipv6_black_list`, `ipv6_white_list`. IPv4 blacklist is preloaded on mount. Expired entries are purged every 5 minutes (entries older than 30 minutes are dropped).

### Static export caveat

`next.config.js` sets `output: 'export'`, meaning `npm run build` produces a fully static site in `/out`. Next.js API routes are therefore not available — all data comes from the external backend at the configured host.

### Styling

Tailwind CSS v4. Dark/light mode is managed entirely through `ThemeProvider`; components read `isDark = actualTheme === 'dark'` and apply conditional class strings inline. There are no CSS modules.

### Settings page

`src/pages/settings.tsx` edits the backend's `config.toml` through `GET`/`PUT urls.config` (`/config`).
It fetches the editable sections (`nic`, `cpu_affinity`, `ml`, general, `suricata`) plus a `risks` array of
per-section warnings and `num_cpus`, tracks which sections the user touched in a `dirty` set, and on save
sends only those sections back as a partial `ConfigUpdate` (types in `src/types/ConfigTypes.tsx`). The
backend never hot-reloads, so every successful save shows a "restart required" notice instead of assuming
the change is live. The Suricata section is read-only when `config.suricata` is `null` (feature disabled in
`config.toml`) — this page cannot enable/disable it, only edit an already-present section.

Sections are shown one at a time behind a tab bar (`TABS` / `activeTab`, not a scrolling stack); a tab
gets a small dot when its section is in the `dirty` set. Save/Reload act across every dirty section
regardless of which tab is active, since `dirty` tracks all of them, not just the visible one.

Every field carries a `description` prop (the field's own `config.toml` comment, e.g. "XSK packet
threads, round-robin across core range [start, end]") rendered via `InfoTooltip` — an ⓘ icon next to
the label that shows the text on hover. This is separate from `hint`, which is a short always-visible
constraint reminder ("Power of 2") shown below the input; a field can carry both.

`InfoTooltip` positions itself with `position: fixed`, computed from the icon's own `getBoundingClientRect()`
on hover (clamped to stay within the viewport), rather than an absolutely-positioned child of the field.
`SectionCard`'s outer `overflow-hidden` (there to round the header/divider corners) would otherwise clip
the tooltip whenever a field sat near the card's edge.

### Restart flow

`RestartProvider` (`src/providers/RestartProvider.tsx`) owns the `POST /system/restart` trigger and the
poll-until-back logic, shared via `useRestart()` so both the Sidebar topbar button and the Settings page
banner drive the same state. Mantis restarts via an in-place `execve()` (same PID), so there's no
new-PID/boot-time signal to poll for — after triggering, it waits ~1.5s then polls `GET /health/status`
(`urls.healthStatus`) every second, requiring at least one failed request (the port genuinely goes away
mid-restart) before a subsequent success counts as "back", to avoid a false positive from the old process
still answering requests during its graceful drain. `/health/status` is used rather than `/config` here
specifically because the provider only needs a liveness check, not the config payload — the Settings
page does its own `load()` separately once `useRestart().status` flips from `waiting` to `idle`. Gives up
with an error after 30 attempts (~30s). `triggerRestart()` asks for a native `window.confirm()` first
since the topbar button is reachable from every page, not just after a config save.

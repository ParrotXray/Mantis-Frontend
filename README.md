# Mantis Frontend

Next.js web UI for the [Mantis](../README.md) network intrusion detection system.
Displays live eBPF traffic statistics, ML anomaly alerts, access control lists, and system logs via WebSocket streams from the Mantis backend.

## Requirements

- Node.js 18+
- Mantis backend running at the configured host (default `192.168.1.3:8080`)

## Getting Started

```bash
npm install
npm run dev        # development server with fast refresh (HTTP)
```

Open `http://localhost:3000` in a browser.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | HTTP dev server with Next.js fast refresh |
| `npm run build` | Static export to `/out` |
| `npm run start` | Serve the static export |
| `npm run lint` | ESLint |
| `npm run dev:https` | HTTPS dev via custom server (requires SSL certs) |
| `npm run start:https` | HTTPS production via custom server |

For HTTPS modes, place certificates at `ssl/root.ca-bundle`, `ssl/server.crt`, and `ssl/server.key`.

## Configuration

All backend endpoints are defined in [`src/config.ts`](src/config.ts). Change `hostname` and `port` there to point at a different backend — every page derives its API and WebSocket URLs from that single file.

```ts
const hostname = "192.168.1.3";
const port = 8080;
```

## Pages

| Route | Description |
|-------|-------------|
| `/setup` | First-boot account creation (shown when no accounts exist) |
| `/login` | Authentication |
| `/` | Home / overview |
| `/dashboard` | System health metrics |
| `/statistics` | Live IPv4/IPv6 flow statistics |
| `/traffic-map` | Geographic traffic map |
| `/access-control` | eBPF IP allow/block lists (ingress & egress) |
| `/detection` | ML anomaly and Suricata rule alerts |
| `/logs` | Live system log stream |

## Architecture

### Provider Tree

```
ErrorBoundary
  ThemeProvider          light/dark/system, persisted to localStorage
    AuthProvider         JWT auth state, RouteGuard (redirects to /setup or /login)
      WebSocketProvider  all WS streams + bootTime
        AccessControlProvider  cached REST layer for IP lists
          <Page>
```

### Authentication

On startup `AuthProvider` calls `GET /auth/status` to check whether any account exists:
- No accounts → redirect to `/setup`
- Accounts exist but no local token → redirect to `/login`
- Valid token → proceed normally

All fetch calls inject the Bearer token via `src/utils/authStore.ts` singleton (`getAuthHeaders()`).

### WebSocket Data Flow

`WebSocketProvider` eagerly opens all connections on mount:
- 24 flow-stats streams (2 IP versions × 2 directions × 2 flow types × 3 time ranges)
- System health stream
- Detection alert stream

Each stream is a RxJS `BehaviorSubject`. Pages subscribe via `getIPv4FlowStream()`, `getIPv6FlowStream()`, `getDetectionAlertStream()`, `getSystemHealthStream()`.

Flow timestamps are nanoseconds since boot; `bootTime` (fetched once via `GET /misc/boot_time`) is required to convert them to wall-clock time and is available via `useContext(WebsocketContext).bootTime`.

The `logs` page manages its own WebSocket connection to `GET /logs/websocket` independently of `WebSocketProvider`.

### Access Control Caching

`AccessControlProvider` caches IP list responses with a 10-minute TTL. Cache keys follow the pattern `{nic}_{ipVersion}_{flow}_{listType}` (e.g. `ingress_ipv4_source_black_list`). Concurrent requests for the same key are deduplicated. Stale entries (>30 min) are purged every 5 minutes.

### Static Export

`next.config.js` sets `output: 'export'`, so `npm run build` produces a fully static site in `/out`. Next.js API routes are not available — all data comes from the external Mantis backend.

### Styling

Tailwind CSS v4. Dark/light mode is managed by `ThemeProvider`; components read `isDark = actualTheme === 'dark'` and apply conditional class strings inline. No CSS modules are used. The sidebar uses a fixed dark-teal palette (`#0a2330`) regardless of theme.
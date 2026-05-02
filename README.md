# syncbrowser

A small read-only PWA file browser for a local [Syncthing](https://syncthing.net/)
instance. Paste your API key once, then browse folders, drill into files,
and inspect what each peer still needs to receive.

- **Backend:** Go (`net/http` + `httputil.ReverseProxy`), `urfave/cli/v3`,
  `embed.FS`.
- **Frontend:** React 19 + TypeScript, Vite, TanStack Query, React Router,
  Tailwind v4, `vite-plugin-pwa`.

## Quick start

You need Go 1.22+, Node 20+, and a running Syncthing instance.

```sh
make build              # builds the UI bundle, then the Go binary into bin/
./bin/syncbrowser       # starts on http://127.0.0.1:8385
```

Open `http://127.0.0.1:8385`, paste your Syncthing API key (Syncthing's
own UI → Settings → GUI), and you're in.

```sh
./bin/syncbrowser --help
```

## Architecture

```
        Browser (React PWA)
            │  /api/*    HttpOnly cookie carries the API key
            ▼
    syncbrowser (Go binary, single port)
      ├── /api/auth/*              login / logout / status
      ├── /api/syncthing/*  ──►    reverse proxy → Syncthing /rest/*
      └── /*                       embedded UI bundle (SPA fallback)
```

The Go binary serves the UI **and** the API on the same port. The
backend is intentionally a thin proxy: it never decodes Syncthing
payloads or models their shapes. All UI logic lives in the frontend.

## Configuration

All flags accept `SYNCBROWSER_*` env var overrides.

| Flag | Default | Purpose |
|---|---|---|
| `--upstream` | `http://localhost:8384` | Syncthing REST base URL |
| `--listen` | `127.0.0.1:8385` | Bind address |
| `--cookie-ttl` | `0` | Auth cookie lifetime; `0` = session cookie |
| `--dev` | off | Permissive CORS for the Vite dev server (`http://localhost:5173`) |
| `--log-level` | `info` | `debug`/`info`/`warn`/`error` |

Defaults bind to loopback and use a session cookie — safe defaults for
a single-user local tool.

## Auth

The user pastes their Syncthing API key into the login form. The
backend validates it once by calling upstream `GET /rest/system/status`
with the key as `X-API-Key`. On success it sets an HttpOnly cookie:

```
Set-Cookie: syncbrowser_key=<api-key>;
            Path=/api;
            HttpOnly;
            SameSite=Strict;
            Secure (only when served over TLS)
```

Notes:
- The cookie value **is** the API key. There is no server-side session
  store; this is a single-user local tool, and the key already lives on
  disk in Syncthing's config — same threat model.
- `Path=/api` keeps the cookie off static-asset requests.
- `SameSite=Strict` blocks cross-site cookie sends.
- Defense-in-depth: state-changing API requests (`POST`/`PUT`/`PATCH`/
  `DELETE`) must include the header `X-Requested-With: syncbrowser`.
  This kills form-post CSRF entirely. The frontend `api/client.ts` adds
  it automatically.

On every proxied request the backend reads the cookie, sets
`X-API-Key: <cookie-value>` on the outbound request, strips
`Cookie` and `Accept-Encoding` (the latter so `/events` long-polls
stream through unbuffered), and forwards.

## API surface (backend)

| Method | Path | Behavior |
|---|---|---|
| `POST` | `/api/auth/login` | Body `{"apiKey": "…"}`. Validates upstream; sets cookie on 200. |
| `POST` | `/api/auth/logout` | Clears the cookie. |
| `GET`  | `/api/auth/status` | Returns `{"authenticated": bool}`. |
| `ANY`  | `/api/syncthing/*` | Auth-gated reverse proxy to upstream `/rest/*`. |
| `GET`  | `/{path...}` | Static UI assets, with SPA fallback to `index.html`. |

Path rewrite example:

```
GET /api/syncthing/db/browse?folder=default&prefix=src/&levels=1
                  ↓
GET <upstream>/rest/db/browse?folder=default&prefix=src/&levels=1
                              + X-API-Key from cookie
```

## UI approach

A small PWA, ~5 routes:

| Route | Source |
|---|---|
| `/login` | API key entry. POSTs to `/api/auth/login`. |
| `/folders` | List from `/rest/system/config`. |
| `/folders/:id/browse/*` | Tree browse via `/rest/db/browse`; trailing path is the prefix. |
| `/folders/:id/file/*` | File detail via `/rest/db/file`. |
| `/folders/:id/needs` | Local needs (`/rest/db/need`) + per-peer remote needs (`/rest/db/remoteneed`). |

Conventions:
- **Data:** TanStack Query v5. Query keys mirror endpoint shape, e.g.
  `['browse', folderID, prefix, levels]`. `staleTime` ~10s.
- **Auth gate:** `<Layout />` checks `/api/auth/status` and redirects to
  `/login` if unauthenticated. The `Login` page does the inverse.
- **Live updates:** opt-in toggle in the header. When enabled, a single
  long-poll loop subscribes to `/rest/events?since=<lastID>&timeout=60`
  and invalidates matching query keys on `ItemFinished`,
  `LocalIndexUpdated`, `RemoteIndexUpdated`, and `FolderSummary` events.
  Default off; the toggle persists in `localStorage`.
- **Styling:** Tailwind v4 (single `@import "tailwindcss";`). A handful
  of small primitives live in `web/src/components/ui/`.
- **PWA:** `vite-plugin-pwa` with `registerType: 'autoUpdate'` and a
  `NetworkOnly` rule for `/api/*` — the service worker never caches API
  responses.
- **Types:** Hand-written in `web/src/lib/types.ts`. Only the fields the
  UI actually reads. Syncthing has no OpenAPI; we are not generating
  types and not chasing exhaustive coverage.

## Development

Two processes, hot-reloaded UI:

```sh
make dev-web   # terminal A: Vite on http://localhost:5173 (HMR)
make dev-go    # terminal B: Go on 127.0.0.1:8385 with --dev (CORS for :5173)
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the Go backend.
The backend's `--dev` flag enables CORS specifically for
`http://localhost:5173` — don't ship it in production.

### Common targets

```sh
make web         # build the UI bundle into web/dist/ (embedded by go build)
make build       # web + go build → bin/syncbrowser
make lint        # golangci-lint v2 (Go)
make lint-web    # eslint v9 + typescript-eslint (frontend)
make fmt         # gofmt + goimports via golangci-lint
make tidy        # go mod tidy
make clean       # remove bin/ and web/dist/
```

`web/dist/` ships with a stub `index.html` so `go run ./cmd/syncbrowser`
works on a fresh clone before `npm run build`. The real bundle
overwrites it during `make web`.

### Project layout

```
cmd/syncbrowser/main.go          # CLI entrypoint (urfave/cli/v3)
internal/config/                 # parsed-flags struct
internal/server/                 # mux, auth, proxy, static (embed), middleware
web/web.go                       # //go:embed all:dist
web/src/api/                     # fetch client + thin endpoint wrappers
web/src/hooks/                   # one hook per endpoint + useEvents + useAuth
web/src/pages/                   # Login, Folders, Browse, FileDetail, Needs
web/src/components/              # Layout + ui primitives
web/src/lib/                     # query client, types, formatters
```

## Further reading

- [`AGENTS.md`](./AGENTS.md) — guidance for making changes (decision
  rationale, gotchas, style).
- [Syncthing REST API](https://docs.syncthing.net/dev/rest.html).

## License

See [`LICENSE`](./LICENSE).

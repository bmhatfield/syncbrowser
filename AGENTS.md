# AGENTS.md

Guidance for agents (human or AI) working on syncbrowser.

## What this is

syncbrowser is a small read-only PWA file browser for a **local** Syncthing
instance. The user pastes their Syncthing API key once, then browses folders,
inspects file/sync state, and views what each peer still needs.

It is two pieces:
- A **Go backend** that proxies the Syncthing REST API and handles auth.
- A **React PWA** that renders the UI.

Single user. Local. No multi-tenant concerns.

## Architecture

```
        Browser (PWA)
            │  /api/*  (HttpOnly cookie carries Syncthing API key)
            ▼
   syncbrowser (Go binary)
     ├── /api/auth/*           handled here
     ├── /api/syncthing/*  ──► reverse proxy ──► http://localhost:8384/rest/*
     └── /*                    serves embedded Vite bundle (SPA fallback)
```

Two intentional asymmetries:
1. The **backend models nothing**. It's a transparent reverse proxy plus
   cookie-based auth. It never decodes or re-shapes Syncthing payloads.
2. The **frontend's types are deliberately narrow**. `web/src/lib/types.ts`
   only declares fields the UI actually reads. Syncthing has no OpenAPI; we
   are not generating types and not chasing exhaustive coverage.

Don't undo these. They're what keeps the project small.

## Technical decisions (and why)

| Decision | Why |
|---|---|
| Go stdlib `net/http` + `httputil.ReverseProxy` | No framework needed; stdlib covers it. |
| `urfave/cli/v3` | User asked for it. Note v3 API: `Action func(ctx, *cli.Command) error`. |
| API key stored **directly** in the cookie (no server-side session map) | Single-user local tool. The key already lives on disk in Syncthing's config; in-process session stores buy nothing. |
| Cookie: `HttpOnly`, `SameSite=Strict`, `Path=/api`, `Secure` only over TLS | Minimum surface; `Path=/api` keeps the cookie off static-asset requests. |
| CSRF: `SameSite=Strict` + `X-Requested-With: syncbrowser` header on state-changing methods | SameSite already blocks cross-site; the header check is belt-and-suspenders and kills form-post CSRF entirely. |
| `FlushInterval: -1` on the proxy + `Accept-Encoding` stripped on outbound | Required so `/rest/events` long-poll responses stream through unbuffered. |
| `Cookie` header deleted on outbound to upstream | Our cookie must never leak to Syncthing. |
| `embed.FS` lives in `web/web.go` | `//go:embed` paths are relative to the source file, so `web.go` must sit at or above `web/dist/`. A stub `web/dist/index.html` + `.gitkeep` are committed so `go run` works on a fresh clone before any frontend build. |
| React 19 + Vite + TypeScript | Largest ecosystem for the libs we want (TanStack Query, vite-plugin-pwa, React Router). |
| TanStack Query v5 with structured keys (`['browse', folderID, prefix, levels]`) | Cache invalidation from `/rest/events` works by matching key prefixes. |
| Tailwind v4 (CSS-first, single `@import "tailwindcss";`) | Zero config; we hand-wrote ~3 primitives instead of pulling a UI library. |
| `vite-plugin-pwa` with `runtimeCaching` rule `urlPattern: /^\/api\//, handler: 'NetworkOnly'` | The service worker must NOT cache API responses. |
| Live events default OFF (toggle in header → `localStorage.eventsEnabled`) | The user said "optionally". Long-poll only runs when the user opts in. |
| `parserOptions.projectService: true` in `eslint.config.js` | tseslint v8 auto-detects the right tsconfig per file. |
| Backend lint: `golangci-lint` v2, fast linters only | `bodyclose`, `contextcheck`, `unparam`, `dupl`, `wsl` are intentionally **off** (slow / SSA-based). |

## Project layout

```
syncbrowser/
├── cmd/syncbrowser/main.go         # urfave/cli/v3 entrypoint
├── internal/
│   ├── config/config.go            # parsed flags → Config struct
│   └── server/
│       ├── server.go               # mux wiring, graceful shutdown
│       ├── auth.go                 # /api/auth/* + cookie handling
│       ├── proxy.go                # ReverseProxy.Rewrite, X-API-Key injection
│       ├── static.go               # embed.FS + SPA fallback
│       └── middleware.go           # logging, CSRF guard, auth gate, dev CORS
├── web/
│   ├── web.go                      # //go:embed all:dist  →  var Assets
│   ├── eslint.config.js            # ESLint v9 flat config
│   ├── vite.config.ts              # PWA plugin + dev /api proxy
│   ├── dist/                       # gitignored except stub + .gitkeep
│   └── src/
│       ├── api/{client,auth,syncthing}.ts
│       ├── hooks/{useFolders,useBrowse,useFile,useNeed,useRemoteNeed,useEvents,useAuth}.ts
│       ├── pages/{Login,Folders,Browse,FileDetail,Needs}.tsx
│       ├── components/{Layout,ui/*}.tsx
│       └── lib/{queryClient,types,format}.ts
├── .golangci.yml                   # v2 schema; fast linters only
├── Makefile                        # web | build | dev-go | dev-web | lint | lint-web | fmt | tidy | clean
└── README.md
```

## Making changes

### Add a new Syncthing endpoint to the UI
The backend almost never needs changes — it proxies everything under
`/api/syncthing/*` transparently.
1. Add a typed call in `web/src/api/syncthing.ts`. Keep the type narrow:
   only the fields the UI will read.
2. Add a hook in `web/src/hooks/` with a structured query key
   (`['<endpoint>', ...args]`). Mirror the existing hooks.
3. If live updates should refresh this view, add an event-type case in
   `web/src/hooks/useEvents.ts` that calls
   `qc.invalidateQueries({ queryKey: ['<endpoint>', ...] })`.

### Add a new page
1. New file under `web/src/pages/`.
2. Register the route in `web/src/router.tsx`. Authenticated pages go
   under the `<Layout />` route; the auth gate lives there.
3. If it needs a header tab, add a `<NavTab>` in `web/src/components/Layout.tsx`.

### Add a UI primitive
Drop a new component in `web/src/components/ui/`. Keep them small and
unstyled-by-default, taking `className` like the existing ones.

### Add a CLI flag
1. Add the flag in `cmd/syncbrowser/main.go`.
2. Read it in `internal/config/config.go` and add to `Config`.
3. Use it in the relevant `internal/server/*.go` file.

### Add Go middleware
Compose it in `withMiddleware` in `internal/server/middleware.go`. Order
matters: outermost should be logging; CSRF runs before auth gate runs
before the proxy.

### Touch the cookie format
Keep the existing semantics (`HttpOnly`, `SameSite=Strict`, `Path=/api`).
If you ever need to encrypt the API key in the cookie, that's a real
change — discuss with the user first; the current threat model assumes
the OS protects the local cookie store.

## Testing

### Quick checks (always run before considering a change done)

```bash
make lint            # Go: golangci-lint v2 with fast linters
make lint-web        # TS: ESLint flat config + typescript-eslint
go build ./...       # Backend compiles
cd web && npm run typecheck && npm run build   # Frontend typechecks + bundles
```

### Smoke test the binary (no live Syncthing required)

```bash
./bin/syncbrowser --listen 127.0.0.1:8395 --upstream http://127.0.0.1:1 --log-level debug &
curl -i http://127.0.0.1:8395/api/auth/status                  # → 200, {"authenticated":false}
curl -i -X POST -H 'X-Requested-With: syncbrowser' \
     -H 'Content-Type: application/json' -d '{"apiKey":"x"}' \
     http://127.0.0.1:8395/api/auth/login                       # → 401 (upstream unreachable, treated as bad key)
curl -i http://127.0.0.1:8395/api/syncthing/system/config       # → 401 (no cookie)
curl -i -X POST http://127.0.0.1:8395/api/auth/login            # → 403 (missing X-Requested-With)
curl -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8395/folders/anything  # → 200 (SPA fallback)
pkill -f bin/syncbrowser
```

### End-to-end (real Syncthing)

```bash
brew install syncthing && syncthing &
# In Syncthing UI (http://localhost:8384), Settings → GUI → copy API key.
# Add a folder; pair a peer to test /db/remoteneed.
make build && ./bin/syncbrowser
# Open http://127.0.0.1:8385 → /login → paste key.
```

Verify:
1. Login sets `Set-Cookie: syncbrowser_key=...; HttpOnly; SameSite=Strict; Path=/api`.
2. `/folders` lists folders → drill into one → file detail → needs page.
3. Toggle "Live updates" header checkbox; `touch <synced>/test.txt` (or
   click Rescan in Syncthing UI). Within 1–2s, the browse view shows the
   new file. DevTools → Network shows long-poll requests to
   `/api/syncthing/events` returning at most every 60s.
4. Click "Sign out" → cookie cleared → redirected to `/login`.

### Dev workflow (two processes)

```bash
make dev-web    # terminal A: Vite on :5173 (HMR)
make dev-go     # terminal B: Go on :8385 with --dev (CORS for :5173)
# Open http://localhost:5173
```

Vite proxies `/api/*` to `:8385`. The backend's `--dev` flag enables CORS
specifically for `http://localhost:5173`. Don't ship `--dev` in production.

## Gotchas

- **Don't model Syncthing types in Go.** The backend stays a transparent
  proxy. If you find yourself decoding upstream JSON in `internal/server/`,
  stop and reconsider.
- **Don't broaden frontend types speculatively.** Add fields to
  `web/src/lib/types.ts` only when a page actually reads them.
- **Don't cache `/api/*` in the service worker.** The `NetworkOnly` rule
  in `vite.config.ts` is intentional; removing it will silently serve
  stale Syncthing data.
- **Don't drop `FlushInterval: -1` from the proxy.** Live events break.
- **Don't drop the `Accept-Encoding` deletion in the proxy rewrite.**
  Upstream gzip can buffer event chunks.
- **Don't commit built assets.** `web/dist/*` is gitignored except
  `.gitkeep` and the stub `index.html`. If `git status` shows a giant
  diff in `web/dist/`, something's wrong with the ignore rules.
- **`web/dist/index.html` is a stub on a fresh clone** so `go run` works
  before `npm run build`. The real bundle overwrites it during `make web`.
- **React effect deps with TanStack Query.** `qc.invalidateQueries` returns
  a Promise — don't forget `void` (the linter will catch it). The
  `no-misused-promises` rule fires when async functions are passed
  directly to JSX event handlers; wrap with `(e) => { void handleX(e); }`.
- **`urfave/cli/v3` ≠ v2.** Action signature is
  `func(ctx context.Context, cmd *cli.Command) error`; `cmd.String("flag")`
  reads values; `cli.EnvVars(...)` for env binding.
- **ESLint with `projectService: true`** auto-detects the tsconfig per
  file. New files outside any tsconfig include will trip the parser.

## Style

- Default to no comments. Add one only when the *why* is non-obvious
  (e.g., `FlushInterval: -1` has a comment because it would look removable).
- Don't add abstractions until there's a second caller. Three similar
  lines are fine.
- Don't add error handling for cases that can't happen. The proxy already
  has a single `ErrorHandler`; per-route try/catch is noise.
- Match existing patterns. New hooks should look like the existing ones.
  New pages should mirror the structure of `Folders.tsx` / `Browse.tsx`.

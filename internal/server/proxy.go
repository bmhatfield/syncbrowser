package server

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"strings"

	"github.com/bhatfield/syncbrowser/internal/config"
)

const proxyPrefix = "/api/syncthing"

func newProxy(cfg config.Config, logger *slog.Logger) http.Handler {
	upstream := cfg.Upstream
	return &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(upstream)

			// /api/syncthing/db/browse?... -> /rest/db/browse?...
			rest := strings.TrimPrefix(r.In.URL.Path, proxyPrefix)
			if !strings.HasPrefix(rest, "/") {
				rest = "/" + rest
			}
			r.Out.URL.Path = "/rest" + rest
			r.Out.URL.RawPath = ""
			r.Out.Host = upstream.Host

			if key := apiKeyFromCookie(r.In); key != "" {
				r.Out.Header.Set("X-API-Key", key)
			}
			r.Out.Header.Del("Cookie")
			// Defeat upstream gzip so /events chunks stream through unbuffered.
			r.Out.Header.Del("Accept-Encoding")
		},
		FlushInterval: -1, // immediate flush; required for /events long-poll streaming
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			logger.Warn("upstream error", "path", r.URL.Path, "err", err)
			http.Error(w, "upstream unreachable", http.StatusBadGateway)
		},
	}
}

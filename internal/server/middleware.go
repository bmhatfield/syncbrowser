package server

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/bhatfield/syncbrowser/internal/config"
)

const csrfHeader = "X-Requested-With"
const csrfValue = "syncbrowser"

func withMiddleware(h http.Handler, cfg config.Config, logger *slog.Logger) http.Handler {
	h = csrfGuard(h)
	if cfg.Dev {
		h = devCORS(h)
	}
	h = requestLogger(h, logger)
	return h
}

// csrfGuard requires an X-Requested-With header on /api/* requests using
// state-changing methods. SameSite=Strict already blocks cross-site cookie
// sends; this is a defense-in-depth check that also kills form-post CSRF.
func csrfGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") && isStateChanging(r.Method) {
			if r.Header.Get(csrfHeader) != csrfValue {
				http.Error(w, "missing "+csrfHeader+" header", http.StatusForbidden)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func isStateChanging(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	}
	return false
}

// requireAuth gates /api/syncthing/* on cookie presence. The proxy itself
// will inject the key, but if the cookie is absent we 401 before touching
// upstream.
func requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if apiKeyFromCookie(r) == "" {
			http.Error(w, "not authenticated", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// devCORS allows the Vite dev server (http://localhost:5173) to call
// /api/* with credentials. Off by default; enabled by --dev.
func devCORS(next http.Handler) http.Handler {
	const origin = "http://localhost:5173"
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") == origin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, "+csrfHeader)
				w.Header().Set("Access-Control-Max-Age", "600")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func requestLogger(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		logger.Debug("http",
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"dur", time.Since(start),
		)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (s *statusWriter) WriteHeader(code int) {
	if !s.wroteHeader {
		s.status = code
		s.wroteHeader = true
	}
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusWriter) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

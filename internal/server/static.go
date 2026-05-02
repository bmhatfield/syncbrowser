package server

import (
	"errors"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/bhatfield/syncbrowser/web"
)

func staticHandler() http.Handler {
	dist, err := fs.Sub(web.Assets, "dist")
	if err != nil {
		// Embed configured incorrectly; fail fast at startup.
		panic("server: failed to sub embedded dist: " + err.Error())
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// /api/* paths shouldn't reach this handler thanks to mux precedence,
		// but defend against route misconfig.
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		clean := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if clean == "" {
			clean = "index.html"
		}

		f, err := dist.Open(clean)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				serveIndex(w, r, dist)
				return
			}
			http.Error(w, "static error", http.StatusInternalServerError)
			return
		}
		stat, err := f.Stat()
		_ = f.Close()
		if err != nil {
			http.Error(w, "static error", http.StatusInternalServerError)
			return
		}
		if stat.IsDir() {
			serveIndex(w, r, dist)
			return
		}

		setCacheHeaders(w, clean)
		http.ServeFileFS(w, r, dist, clean)
	})
}

func serveIndex(w http.ResponseWriter, r *http.Request, dist fs.FS) {
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFileFS(w, r, dist, "index.html")
}

func setCacheHeaders(w http.ResponseWriter, p string) {
	// Vite emits hashed filenames under /assets/ — safe to long-cache.
	if strings.HasPrefix(p, "assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		return
	}
	w.Header().Set("Cache-Control", "no-cache")
}

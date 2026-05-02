package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/bhatfield/syncbrowser/internal/config"
)

func Run(ctx context.Context, cfg config.Config) error {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: cfg.LogLevel}))

	srv := &http.Server{
		Addr:              cfg.Listen,
		Handler:           newRouter(cfg, logger),
		ReadHeaderTimeout: 10 * time.Second,
		// No write timeout: /events long-polls (timeout=60s upstream) need to stream.
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("listening",
			"addr", cfg.Listen,
			"upstream", cfg.Upstream.String(),
			"dev", cfg.Dev,
		)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case <-ctx.Done():
		logger.Info("shutting down")
		shutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return srv.Shutdown(shutCtx)
	case err := <-errCh:
		return err
	}
}

func newRouter(cfg config.Config, logger *slog.Logger) http.Handler {
	r := chi.NewRouter()

	r.Use(requestLogger(logger))
	r.Use(middleware.Recoverer)
	if cfg.Dev {
		r.Use(devCORS)
	}
	r.Use(csrfGuard)

	auth := newAuthHandlers(cfg, logger)
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/login", auth.login)
		r.Post("/logout", auth.logout)
		r.Get("/status", auth.status)
	})

	proxy := newProxy(cfg, logger)
	r.Group(func(r chi.Router) {
		r.Use(requireAuth)
		r.Mount(proxyPrefix, proxy)
	})

	r.Mount("/", staticHandler())

	return r
}

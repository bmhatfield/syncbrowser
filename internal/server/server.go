package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/bhatfield/syncbrowser/internal/config"
)

func Run(ctx context.Context, cfg config.Config) error {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: cfg.LogLevel}))

	mux := http.NewServeMux()
	registerRoutes(mux, cfg, logger)

	handler := withMiddleware(mux, cfg, logger)

	srv := &http.Server{
		Addr:              cfg.Listen,
		Handler:           handler,
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

func registerRoutes(mux *http.ServeMux, cfg config.Config, logger *slog.Logger) {
	auth := newAuthHandlers(cfg, logger)
	mux.HandleFunc("POST /api/auth/login", auth.login)
	mux.HandleFunc("POST /api/auth/logout", auth.logout)
	mux.HandleFunc("GET /api/auth/status", auth.status)

	proxy := newProxy(cfg, logger)
	mux.Handle(proxyPrefix+"/", requireAuth(proxy))

	mux.Handle("/", staticHandler())
}

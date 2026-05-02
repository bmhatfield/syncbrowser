package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/urfave/cli/v3"

	"github.com/bhatfield/syncbrowser/internal/config"
	"github.com/bhatfield/syncbrowser/internal/server"
)

func main() {
	cmd := &cli.Command{
		Name:  "syncbrowser",
		Usage: "Read-only PWA browser for a local Syncthing instance",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:    "upstream",
				Sources: cli.EnvVars("SYNCBROWSER_UPSTREAM"),
				Value:   "http://localhost:8384",
				Usage:   "Syncthing REST base URL",
			},
			&cli.StringFlag{
				Name:    "listen",
				Sources: cli.EnvVars("SYNCBROWSER_LISTEN"),
				Value:   "127.0.0.1:8385",
				Usage:   "address to bind",
			},
			&cli.DurationFlag{
				Name:    "cookie-ttl",
				Sources: cli.EnvVars("SYNCBROWSER_COOKIE_TTL"),
				Value:   0,
				Usage:   "cookie lifetime; 0 = session cookie",
			},
			&cli.BoolFlag{
				Name:    "dev",
				Sources: cli.EnvVars("SYNCBROWSER_DEV"),
				Usage:   "permissive CORS for http://localhost:5173 (Vite dev server)",
			},
			&cli.StringFlag{
				Name:    "log-level",
				Sources: cli.EnvVars("SYNCBROWSER_LOG_LEVEL"),
				Value:   "info",
				Usage:   "debug|info|warn|error",
			},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			cfg, err := config.From(cmd)
			if err != nil {
				return err
			}
			ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
			defer stop()
			return server.Run(ctx, cfg)
		},
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		fmt.Fprintln(os.Stderr, "syncbrowser:", err)
		os.Exit(1)
	}
}

package config

import (
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"github.com/urfave/cli/v3"
)

type Config struct {
	Upstream  *url.URL
	Listen    string
	CookieTTL time.Duration
	Dev       bool
	LogLevel  slog.Level
}

func From(cmd *cli.Command) (Config, error) {
	upstreamRaw := cmd.String("upstream")
	u, err := url.Parse(upstreamRaw)
	if err != nil {
		return Config{}, fmt.Errorf("invalid upstream URL %q: %w", upstreamRaw, err)
	}
	if u.Scheme == "" || u.Host == "" {
		return Config{}, fmt.Errorf("upstream URL must include scheme and host: %q", upstreamRaw)
	}

	level, err := parseLevel(cmd.String("log-level"))
	if err != nil {
		return Config{}, err
	}

	return Config{
		Upstream:  u,
		Listen:    cmd.String("listen"),
		CookieTTL: cmd.Duration("cookie-ttl"),
		Dev:       cmd.Bool("dev"),
		LogLevel:  level,
	}, nil
}

func parseLevel(s string) (slog.Level, error) {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug, nil
	case "info", "":
		return slog.LevelInfo, nil
	case "warn", "warning":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return 0, fmt.Errorf("unknown log level %q", s)
	}
}

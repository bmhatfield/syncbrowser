// Package web embeds the built Vite output into the Go binary.
package web

import "embed"

//go:embed all:dist
var Assets embed.FS

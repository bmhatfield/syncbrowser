// Package web embeds the built Vite output into the Go binary.
package web

import "embed"

// No "all:" prefix: dotfiles like .gitkeep (used as a fresh-clone stub
// holder) are excluded automatically, so they don't bloat the binary.
//
//go:embed dist
var Assets embed.FS

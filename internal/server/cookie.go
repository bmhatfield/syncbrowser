package server

import (
	"net/http"
	"time"
)

// cookieName is the name of the auth cookie. Its value is the user's
// Syncthing API key directly (see AGENTS.md for rationale).
const cookieName = "syncbrowser_key"

// apiKeyFromCookie returns the API key carried by the auth cookie, or
// "" if absent.
func apiKeyFromCookie(r *http.Request) string {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

// newCookie builds an auth cookie with the project's standard attributes.
// A non-zero ttl is applied as MaxAge; ttl <= 0 yields a session cookie.
// Pass value="" together with the caller setting MaxAge=-1 to clear.
func newCookie(r *http.Request, value string, ttl time.Duration) *http.Cookie {
	c := &http.Cookie{
		Name:     cookieName,
		Value:    value,
		Path:     "/api",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   r.TLS != nil,
	}
	if ttl > 0 && value != "" {
		c.MaxAge = int(ttl.Seconds())
	}
	return c
}

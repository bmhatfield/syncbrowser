package server

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/bhatfield/syncbrowser/internal/config"
)

const cookieName = "syncbrowser_key"

type authHandlers struct {
	cfg    config.Config
	logger *slog.Logger
	client *http.Client
}

func newAuthHandlers(cfg config.Config, logger *slog.Logger) *authHandlers {
	return &authHandlers{
		cfg:    cfg,
		logger: logger,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

type loginReq struct {
	APIKey string `json:"apiKey"`
}

func (a *authHandlers) login(w http.ResponseWriter, r *http.Request) {
	var body loginReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.APIKey == "" {
		http.Error(w, "apiKey required", http.StatusBadRequest)
		return
	}

	if err := a.validateUpstream(r.Context(), body.APIKey); err != nil {
		a.logger.Info("login rejected", "err", err)
		http.Error(w, "invalid api key", http.StatusUnauthorized)
		return
	}

	http.SetCookie(w, a.makeCookie(r, body.APIKey))
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *authHandlers) logout(w http.ResponseWriter, r *http.Request) {
	c := a.makeCookie(r, "")
	c.MaxAge = -1
	c.Expires = time.Unix(0, 0)
	http.SetCookie(w, c)
	w.WriteHeader(http.StatusNoContent)
}

func (a *authHandlers) status(w http.ResponseWriter, r *http.Request) {
	authed := apiKeyFromCookie(r) != ""
	writeJSON(w, http.StatusOK, map[string]bool{"authenticated": authed})
}

func (a *authHandlers) validateUpstream(ctx context.Context, key string) error {
	u := *a.cfg.Upstream
	u.Path = "/rest/system/status"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), http.NoBody)
	if err != nil {
		return err
	}
	req.Header.Set("X-API-Key", key)
	resp, err := a.client.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return errors.New("upstream rejected key: " + resp.Status)
	}
	return nil
}

func (a *authHandlers) makeCookie(r *http.Request, value string) *http.Cookie {
	c := &http.Cookie{
		Name:     cookieName,
		Value:    value,
		Path:     "/api",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   r.TLS != nil,
	}
	if a.cfg.CookieTTL > 0 && value != "" {
		c.MaxAge = int(a.cfg.CookieTTL.Seconds())
	}
	return c
}

func apiKeyFromCookie(r *http.Request) string {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

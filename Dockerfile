# syntax=docker/dockerfile:1.7

# 1. Build the Vite bundle.
FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 2. Build the Go binary with the bundle embedded.
FROM golang:1.26-alpine AS go
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY web/web.go ./web/web.go
COPY --from=web /src/web/dist ./web/dist
ENV CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/syncbrowser ./cmd/syncbrowser

# 3. Minimal runtime: static distroless, non-root.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=go /out/syncbrowser /usr/local/bin/syncbrowser
# Listen on all interfaces so the published port is reachable.
ENV SYNCBROWSER_LISTEN=0.0.0.0:8385
EXPOSE 8385
ENTRYPOINT ["/usr/local/bin/syncbrowser"]

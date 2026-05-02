.PHONY: web web-deps ui go build dev-go dev-web tidy lint lint-web typecheck-web fmt-web fix-web fmt clean

BIN := bin/syncbrowser

# Full UI build with clean dep install. Use on fresh clones / CI.
web: web-deps ui

web-deps:
	cd web && npm ci

# Incremental UI build (assumes web/node_modules is populated).
ui:
	cd web && npm run build

# Just the Go binary; assumes web/dist is already populated.
go:
	go build -o $(BIN) ./cmd/syncbrowser

build: web go

dev-go:
	go run ./cmd/syncbrowser --dev

dev-web:
	cd web && npm run dev

tidy:
	go mod tidy

lint:
	golangci-lint run ./...

lint-web:
	cd web && npm run lint

typecheck-web:
	cd web && npm run typecheck

fix-web:
	cd web && npm run lint:fix

fmt:
	golangci-lint fmt ./...

clean:
	rm -rf bin web/dist
	mkdir -p web/dist
	touch web/dist/.gitkeep web/dist/index.html

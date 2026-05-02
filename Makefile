.PHONY: web build dev-go dev-web tidy lint lint-web fmt clean

BIN := bin/syncbrowser

web:
	cd web && npm ci && npm run build

build: web
	go build -o $(BIN) ./cmd/syncbrowser

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

fmt:
	golangci-lint fmt ./...

clean:
	rm -rf bin web/dist
	mkdir -p web/dist
	touch web/dist/.gitkeep

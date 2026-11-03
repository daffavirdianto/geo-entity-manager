.PHONY: backend frontend test up

backend:
	cd backend && go run ./cmd/server

frontend:
	cd frontend && npm install && npm run dev

test:
	cd backend && go test ./...
	cd frontend && npm run typecheck && npm test

up:
	docker compose up --build

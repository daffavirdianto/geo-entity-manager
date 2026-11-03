# CLAUDE.md

Guidance for AI agents working in this repository.

## Project
Entity Map: a web app to show and manage entities (vehicles, IoT devices, facilities, ...) that have a geographic position.
- `backend/`: Go 1.22, standard library only (no third-party modules).
- `frontend/`: React 18 + TypeScript + Vite, Leaflet map, TanStack Query, react-hook-form + Zod.

## Commands
| Task | Command |
|---|---|
| Run backend (port 8080) | `cd backend && go run ./cmd/server` |
| Backend tests | `cd backend && go test ./...` |
| Run frontend (port 5173, proxies /api to :8080) | `cd frontend && npm install && npm run dev` |
| Frontend typecheck / tests / build | `npm run typecheck` / `npm test` / `npm run build` |
| Everything in Docker | `docker compose up --build` (UI on :3000) |

Always run `gofmt -l .`, `go vet ./...`, `go test ./...`, `npm run typecheck` and `npm test` before finishing a change.

## Architecture
- `internal/entity`: domain model + validation rules (single source of truth for the backend).
- `internal/store`: `Store` interface and `FileStore` (in-memory map persisted atomically to a JSON file). Replace it with SQL by implementing `Store`; the HTTP layer does not change.
- `internal/api`: `net/http` ServeMux (Go 1.22 method patterns), JSON helpers, CORS/logging/recover middleware.
- `frontend/src/schema.ts`: Zod schema mirroring backend validation. `types.ts` holds the enums mirrored from Go.
- `frontend/src/App.tsx` owns UI mode (`idle | view | create | edit`), the draft position and filters. Server state lives in TanStack Query (`useEntities.ts`).

## Rules and conventions
- Validation lives on BOTH sides. If you change a rule (ranges, lengths, enums), change `entity.go`, `schema.ts`, `types.ts` and the tests together. Old generic type values are migrated in `entity.MigrateLegacyType`.
- Entity fields: `name` (1-100), `type` (14 concrete kinds: truck, car, motorcycle, bus, sensor, gateway, camera, gps_tracker, warehouse, office, factory, gas_station, charging_station, other; categories vehicle/iot/facility/other live in `types.ts` and drive marker shape and menu grouping), `status` (active|inactive|maintenance), `latitude` (-90..90), `longitude` (-180..180), `description` (<=500).
- Coordinates are pointers in the Go `Input` so that `0` is valid and missing is detected.
- Error format: `{"error": "<code>", "message": "...", "fields": {"<field>": "<msg>"}}`. 400 = malformed JSON/unknown field/bad filter, 422 = validation failed, 404 = not found.
- Leaflet uses `[lat, lng]`. Never swap the order. Longitude from the map is wrapped into [-180, 180].
- Custom `divIcon` markers are used on purpose (default Leaflet icons break under Vite). Marker shape = category, colour = status.
- Do not add dependencies to the backend without a strong reason. Keep the frontend dependency list small.
- react-leaflet only applies changes to `position`, `icon`, `draggable` and a few other props after mount. `className` on `MapContainer` and `interactive` on `Marker` are NOT updated; toggle behaviour through a parent class and CSS instead (see `.stage--picking`).
- Unsaved form changes are guarded in `App.tsx` via `guard()`; any new action that leaves the form must go through it.
- App-level tests stub `MapView`; keep its props contract in sync with the stub in `App.test.tsx`.
- Never commit `backend/data/`, `.env`, binaries, or `node_modules`.

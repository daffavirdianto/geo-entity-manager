# Entity Map

Aplikasi untuk menampilkan dan mengelola *entity* yang memiliki lokasi geografis (kendaraan, perangkat IoT, fasilitas, dll.) di atas peta. Dibuat untuk Take-Home Test Software Developer.

- **Frontend:** React 18 + TypeScript (Vite), Leaflet, TanStack Query, react-hook-form + Zod
- **Backend:** Go 1.22, hanya standard library
- **Penyimpanan:** file JSON dengan penulisan atomik (di balik interface `Store`, lihat [Keputusan desain](#keputusan-desain))

## Fitur

- Semua entity tampil sebagai marker di peta. **Bentuk marker = kategori** (bulat kendaraan, kotak perangkat IoT, belah ketupat fasilitas, cincin lainnya), **warna = status** (hijau aktif, kuning maintenance, abu-abu nonaktif). Nama dan jenis objek tampil saat kursor diarahkan ke marker.
- **14 jenis objek dunia nyata**, dikelompokkan per kategori: *Kendaraan* (truk, mobil, motor, bus), *Perangkat IoT* (sensor, gateway, kamera CCTV, GPS tracker), *Fasilitas* (gudang, kantor, pabrik, SPBU, stasiun pengisian EV), dan lainnya.
- Klik marker atau item di sidebar untuk melihat detail (nama, tipe, status, koordinat, deskripsi, waktu dibuat dan diubah).
- Tambah entity: isi form, lalu **klik peta** untuk menentukan posisi (atau ketik koordinat manual; marker mengikuti).
- Edit entity: ubah atribut, **drag marker** atau klik peta untuk memindahkan lokasi.
- Hapus entity dengan dialog konfirmasi.
- Peringatan sebelum membuang perubahan form yang belum disimpan (saat pindah entity atau membatalkan).
- Sidebar dengan pencarian nama, filter tipe dan status, klik item untuk terbang ke marker.
- Validasi di **frontend (Zod)** dan **backend (Go)**; pesan error dari server ditampilkan di samping field yang bersangkutan.
- State loading, kosong, dan error (dengan tombol coba lagi). Layout responsif untuk layar kecil.
- Data contoh (14 entity, satu per jenis, di sekitar Jakarta) dibuat otomatis saat pertama kali dijalankan.

## Cara menjalankan

### Opsi A: Docker (paling mudah)

Prasyarat: Docker dengan Compose v2.

```bash
docker compose up --build
```

Buka **http://localhost:3000**. API juga tersedia langsung di http://localhost:8080/api/entities. Data tersimpan di volume Docker `entity-data` (hapus dengan `docker compose down -v`).

### Opsi B: Manual (mode development)

Prasyarat: **Go 1.22+** dan **Node.js 20+**.

Terminal 1, backend:
```bash
cd backend
go run ./cmd/server          # http://localhost:8080
```

Terminal 2, frontend:
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173 (request /api diteruskan ke :8080)
```

Buka **http://localhost:5173**.

### Konfigurasi (environment variable backend)

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `8080` | Port HTTP |
| `DATA_FILE` | `./data/entities.json` | Lokasi file data |
| `SEED` | `true` | Isi data contoh jika data kosong |
| `CORS_ORIGIN` | `*` | Nilai header `Access-Control-Allow-Origin` |

Frontend: `VITE_API_URL` (opsional, default kosong = path relatif `/api`), dan `VITE_PROXY_TARGET` untuk mengubah target proxy dev.

### Menjalankan test

```bash
cd backend && go test -race ./...
cd frontend && npm run typecheck && npm test
```

Test backend mencakup validasi, store (termasuk akses bersamaan dan persistensi), dan handler HTTP. Test frontend mencakup skema Zod dan alur aplikasi (daftar, filter, state error, tambah dengan validasi client dan error dari server, edit, hapus dengan konfirmasi, peringatan perubahan belum disimpan). Komponen peta Leaflet diganti stub pada test karena membutuhkan layout browser. CI GitHub Actions (`.github/workflows/ci.yml`) menjalankan semuanya.

## API

Base path: `/api`. Semua body berformat JSON.

| Method | Path | Keterangan | Status sukses |
|---|---|---|---|
| GET | `/api/health` | Health check | 200 |
| GET | `/api/entities?type=&status=&q=` | Daftar entity, filter opsional | 200 |
| GET | `/api/entities/{id}` | Detail | 200 |
| POST | `/api/entities` | Buat entity | 201 + header `Location` |
| PUT | `/api/entities/{id}` | Ganti seluruh atribut | 200 |
| DELETE | `/api/entities/{id}` | Hapus | 204 |

Contoh body POST/PUT:

```json
{ "name": "Truk 01", "type": "truck", "status": "active",
  "latitude": -6.1754, "longitude": 106.8272, "description": "Armada Monas" }
```

**Aturan validasi** (sama di frontend dan backend): `name` wajib, maks. 100 karakter; `type` salah satu dari `truck, car, motorcycle, bus, sensor, gateway, camera, gps_tracker, warehouse, office, factory, gas_station, charging_station, other`; `status` salah satu dari `active | inactive | maintenance`; `latitude` -90..90; `longitude` -180..180 (wajib, `0` valid); `description` maks. 500 karakter. Body dengan field tak dikenal ditolak.

**Format error:**

| Status | Kapan |
|---|---|
| 400 `invalid_json` | JSON rusak, field tak dikenal, tipe data salah, filter query tidak valid |
| 404 `not_found` | ID atau route tidak ada |
| 413 `payload_too_large` | Body > 1 MiB |
| 422 `validation_failed` | Nilai tidak lolos validasi |

```json
{ "error": "validation_failed", "message": "one or more fields are invalid",
  "fields": { "latitude": "must be between -90 and 90" } }
```

## Struktur proyek

```
backend/
  cmd/server/          main.go, seed.go
  internal/entity/     model + validasi (+ test)
  internal/store/      interface Store, FileStore (+ test)
  internal/api/        handler, middleware (+ test)
frontend/src/
  components/          MapView, Sidebar, DetailPanel, EntityForm, ConfirmDialog, PinGlyph
  App.tsx              state mode UI (idle/view/create/edit), filter, toast
  api.ts               klien HTTP + ApiError
  schema.ts            skema Zod (+ test)
  useEntities.ts       hooks TanStack Query
docker-compose.yml, CLAUDE.md
```

## Alasan pemilihan library

| Library | Alasan |
|---|---|
| **Leaflet + react-leaflet 4** | Ringan, matang, dan memakai tile OpenStreetMap sehingga **tidak perlu API key**: reviewer bisa langsung menjalankan. react-leaflet 4 dipilih karena cocok dengan React 18. |
| **TanStack Query** | Server state (cache, loading/error, refetch, invalidasi setelah mutasi) tanpa menulis reducer manual. State UI cukup `useState` di `App`, jadi tidak perlu Redux/Zustand. |
| **react-hook-form + Zod** | Form dengan re-render minimal; skema Zod mudah dibaca dan membuat aturan validasi frontend setara dengan backend. Pesan error dari server dipetakan balik ke field lewat `setError`. |
| **Vite** | Dev server dan build cepat untuk React + TS. Proxy `/api` menghindari konfigurasi CORS saat development. |
| **Vitest** | Satu toolchain dengan Vite, dipakai untuk menguji skema validasi. |
| **Go standard library** (`net/http` 1.22) | Routing berbasis method dan path parameter sudah tersedia di Go 1.22, jadi router pihak ketiga tidak diperlukan. Tanpa dependency = build cepat, mudah di-review, dan tidak ada masalah CGO. |
| **Marker `divIcon` kustom** | Ikon default Leaflet bermasalah di bundler, dan bentuk + warna memberi informasi tipe dan status sekaligus. |
| **Nginx (Docker)** | Menyajikan build statis dan meneruskan `/api` ke backend, sehingga frontend dan backend satu origin. |

## Keputusan desain

- **Penyimpanan berupa file JSON, bukan SQL.** Backend hanya bergantung pada interface `store.Store`. `FileStore` menyimpan data di memori (dilindungi `RWMutex`) dan menulis ke disk secara atomik (file sementara lalu rename) di setiap perubahan. Ini dipilih agar proyek tanpa dependency dan langsung jalan. Untuk produksi, implementasikan `Store` dengan PostgreSQL/PostGIS atau SQLite tanpa mengubah layer HTTP.
- **Jenis objek berupa daftar tetap (enum) yang konkret**, bukan teks bebas, agar bisa divalidasi, difilter, dan dikelompokkan. Menambah jenis baru = ubah `entity.go`, `types.ts`, dan test. Data lama dengan tipe generik (`vehicle`, `iot_device`, `facility`) otomatis dimigrasi saat dimuat (menjadi `car`, `sensor`, `office`).
- **`PUT` = ganti penuh**, sehingga semua field wajib dikirim.
- **Filter di UI dilakukan di sisi client** (data kecil, instan). Endpoint `GET /api/entities` sudah mendukung `type`, `status`, dan `q` untuk dataset besar.
- **Validasi ganda disengaja.** Frontend untuk umpan balik cepat, backend sebagai penjaga yang sebenarnya.

## Workflow penggunaan Agentic AI

- **Tool:** Claude (Anthropic) di chat dengan akses sandbox (menjalankan perintah, membuat file).
- **Cakupan:** Claude membuat sebagian besar kode (backend Go, frontend React, Docker, dokumentasi, `CLAUDE.md`) dari brief tes dan satu permintaan "buatkan semuanya". Keputusan awal (stack, desain API, aturan validasi, rencana fitur) dibahas lebih dulu dalam percakapan.
- **Verifikasi yang dijalankan oleh agent:** `gofmt`, `go vet`, `go test -race` (validasi, store, handler HTTP), `tsc --noEmit`, `vitest` (skema Zod dan alur aplikasi dengan peta di-stub), `vite build`, dan smoke test backend dengan `curl` (CRUD, error 404/422, persistensi setelah restart). Test alur aplikasi diuji dengan mutasi sederhana (guard dimatikan, test harus gagal).
- **Review putaran kedua oleh agent:** menemukan dua bug pada peta (kursor crosshair tidak berubah dan marker tetap bisa diklik saat form terbuka, karena react-leaflet tidak memperbarui prop `className` dan `interactive` setelah mount), lalu memperbaikinya, serta menambah peringatan perubahan belum disimpan dan memperbaiki aksesibilitas label form.
- **Belum diverifikasi oleh agent:** tampilan dan interaksi UI di browser sungguhan (klik peta, drag marker, dialog) serta `docker compose up`. Keduanya perlu dites manual.
- **Kontribusi manusia:** *(isi: apa yang Anda review, ubah, dan tes sendiri, misalnya hasil uji manual di browser, perubahan yang Anda minta, bagian yang Anda tulis ulang).*
- **Pengarahan agent:** aturan proyek ada di [`CLAUDE.md`](./CLAUDE.md) (perintah, arsitektur, konvensi validasi).

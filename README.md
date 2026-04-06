# Seraphine Final

Seraphine Final adalah platform fashion commerce full-stack yang menggabungkan storefront pelanggan, dashboard admin operasional, dan backend API terpusat. Proyek ini dirancang untuk mendukung alur bisnis end-to-end: katalog produk, stok per varian, cart, wishlist, checkout, order management, customer management, notifikasi, AI assistant, AI size recommendation, dan monitoring IoT berbasis stream.

README ini menggambarkan kondisi proyek saat ini berdasarkan source code yang ada di repository.

## Executive Summary

- Storefront berada di folder `web/` dan dibangun dengan Vite, Tailwind CSS, dan modular vanilla JavaScript.
- Admin dashboard berada di folder `admin/` dan digunakan untuk operasi katalog, order, customer, membership, notifikasi, export, serta monitor IoT.
- Backend berada di folder `backend/` dan dibangun dengan FastAPI, SQLAlchemy, dan MySQL.
- Backend menjadi source of truth untuk produk, stok, order, customer, gambar produk, notifikasi, AI endpoints, dan IoT endpoints.
- Frontend build dapat disajikan langsung oleh FastAPI untuk deployment terpadu.

## Architecture Overview

```text
Seraphine_final/
|-- admin/                  Admin dashboard (Vite + Tailwind + vanilla JS)
|-- assets/
|   `-- img/                Shared uploaded product images
|-- backend/                FastAPI application + SQLAlchemy models + business logic
|-- scripts/                Workspace helper scripts
|-- web/                    Customer storefront (Vite + Tailwind + vanilla JS)
|-- package.json            Root workspace scripts
`-- README.md
```

## Main Capabilities

### Customer Storefront

- Menampilkan katalog produk dari backend.
- Menyediakan detail produk dengan pilihan size dan color.
- Mendukung registrasi, login, dan sesi user berbasis JWT.
- Menyediakan wishlist dan shopping cart untuk user yang login.
- Menjalankan checkout dengan validasi stok per varian size/color.
- Menyediakan riwayat order dan detail order per user.
- Mendukung review produk setelah order berstatus `completed`.
- Memiliki chatbot `Seraphine AI` berbasis streaming response.
- Memiliki AI size recommendation berdasarkan data ukuran customer.

### Admin Dashboard

- Dashboard operasional dengan data live dari backend.
- CRUD produk dan pengelolaan katalog.
- Manajemen stok per varian produk.
- Upload gambar produk ke folder shared assets.
- Monitoring order dan pembaruan status order.
- Manajemen customer list dari database backend.
- Pengelolaan membership customer berbasis RFID UID.
- Notifikasi admin untuk event order.
- Modul export dokumen berbasis browser.
- Monitor IoT untuk sensor, event log, dan inventory snapshot.
- Manajemen admin access account untuk akun operasional non-demo.

### Backend API

- REST API untuk produk, cart, wishlist, order, account, customer, dan admin.
- Authentication user dengan JWT.
- Authentication admin access account.
- Validasi stok varian saat add-to-cart dan checkout.
- Upload dan serving gambar produk dari `/assets/img`.
- Server-Sent Events untuk AI chat dan IoT stream.
- Notifikasi untuk admin dan user.
- Auto bootstrap kolom database tambahan saat startup.
- Static serving untuk hasil build storefront dan admin.

## Technology Stack

### Frontend

- Vite 6
- Tailwind CSS 4
- Vanilla JavaScript modular
- html2canvas dan jsPDF untuk kebutuhan export admin

### Backend

- FastAPI
- Uvicorn
- SQLAlchemy 2
- MySQL + PyMySQL
- passlib + bcrypt
- python-jose
- httpx
- python-dotenv

### Workspace Tooling

- Node.js + npm
- `concurrently` untuk menjalankan multi-service dari root workspace
- Python environment lokal atau Conda

## Current Project Structure

### Root Workspace

- `package.json`: menjalankan web, admin, dan backend secara bersamaan.
- `scripts/run-backend.cjs`: launcher backend yang mendukung Conda, Python aktif, atau interpreter custom.
- `assets/img/`: lokasi file upload gambar produk.

### Web App

- `web/index.html`: shell utama storefront.
- `web/main.js`: entry point aplikasi storefront.
- `web/js/config.js`: konfigurasi API base URL storefront.
- `web/js/chatbot.js`: widget chat AI.
- `web/js/logic.js`: logika bisnis frontend storefront.
- `web/style.css`: styling utama storefront.

### Admin App

- `admin/index.html`: shell utama admin dashboard.
- `admin/src/script.js`: entry point admin dashboard.
- `admin/src/modules/config.js`: konfigurasi API base URL admin.
- `admin/src/modules/products.js`: modul katalog dan stok.
- `admin/src/modules/orders.js`: modul order management.
- `admin/src/modules/customers.js`: modul customer management.
- `admin/src/modules/iot-dashboard.js`: monitor IoT real-time.
- `admin/src/modules/export.js`: utilitas export dokumen.

### Backend App

- `backend/app.py`: aplikasi FastAPI utama dan mayoritas endpoint bisnis.
- `backend/chat_routes.py`: endpoint AI chat dan AI size recommendation.
- `backend/iot_routes.py`: endpoint IoT simulator, stream, dan snapshot.
- `backend/ai_service.py`: integrasi Gemini untuk AI response.
- `backend/database.py`: koneksi database SQLAlchemy.
- `backend/models.py`: definisi model database.
- `backend/product_catalog.py`: helper katalog, ukuran, warna, harga, dan stok varian.
- `backend/requirements.txt`: dependency Python backend.

## Runtime Ports and URLs

### Development Ports

- Storefront Vite dev server: `http://localhost:4173`
- Admin Vite dev server: `http://localhost:3101`
- Backend API: `http://localhost:8000`

### Production-style Paths Served by FastAPI

- Storefront build: `/`
- Admin build: `/control-room`
- Shared image assets: `/assets/img/...`

## Requirements

Sebelum menjalankan proyek, siapkan:

- Node.js 18 atau lebih baru
- npm 9 atau lebih baru
- Python 3.10 atau lebih baru
- MySQL yang dapat diakses oleh aplikasi backend

## Environment Configuration

### Backend Environment Variables

Backend membaca environment variable berikut:

```env
SQLALCHEMY_DATABASE_URL=mysql+pymysql://root:@localhost/seraphine_db
SECRET_KEY=replace-this-in-real-environment
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GEMINI_API_KEY=your-gemini-api-key
CORS_ALLOWED_ORIGINS=http://localhost:4173,http://localhost:3101
CORS_ALLOWED_ORIGIN_REGEX=https?://((localhost|127\.0\.0\.1)(:\d+)?|([a-z0-9-]+\.)?(ngrok-free\.app|ngrok\.app|ngrok-free\.dev))$
USE_CONDA=true
CONDA_ENV_NAME=seraphine
BACKEND_PYTHON_CMD=
```

Catatan penting:

- `SQLALCHEMY_DATABASE_URL` default saat ini mengarah ke database lokal `seraphine_db`.
- `GEMINI_API_KEY` diperlukan untuk fitur AI chat dan size recommendation yang stabil.
- `CORS_ALLOWED_ORIGINS` dapat diisi daftar origin tambahan yang dipisahkan koma.
- `CORS_ALLOWED_ORIGIN_REGEX` sudah mengizinkan localhost dan domain ngrok umum.

### Frontend Environment Variables

Contoh file yang sudah tersedia:

- `web/.env.example`
- `admin/.env.example`

Isi contoh:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Rekomendasi development:

- Buat `web/.env.local` jika storefront perlu diarahkan ke backend selain default lokal.
- Buat `admin/.env.local` jika admin perlu diarahkan ke backend publik atau staging.

## Installation

### 1. Install Node.js dependencies

Dari root workspace:

```powershell
npm install
npm --prefix web install
npm --prefix admin install
```

### 2. Install Python dependencies

Masuk ke folder backend lalu install dependency Python:

```powershell
cd backend
pip install -r requirements.txt
cd ..
```

Jika environment Anda mengalami issue kompatibilitas bcrypt, paket versi `4.0.1` sudah dicantumkan di requirements backend saat ini.

### 3. Siapkan database

Pastikan MySQL aktif dan database target tersedia.

Contoh database default:

```sql
CREATE DATABASE seraphine_db;
```

Tabel akan dibuat otomatis oleh SQLAlchemy saat backend start.

## Running the Project

### Option A: Jalankan semua service dari root

```powershell
npm run dev
```

Perintah root ini akan menjalankan:

- storefront Vite dev server
- admin Vite dev server
- backend FastAPI melalui `scripts/run-backend.cjs`

### Option B: Jalankan per aplikasi

#### Backend

```powershell
cd backend
uvicorn app:app --reload
```

Atau dari root dengan helper script:

```powershell
node scripts/run-backend.cjs
```

#### Storefront

```powershell
cd web
npm run dev
```

#### Admin Dashboard

```powershell
cd admin
npm run dev
```

## Backend Launcher Modes

Root helper `scripts/run-backend.cjs` mendukung tiga mode eksekusi:

### 1. Default Conda mode

Secara default, script mencoba menjalankan:

```powershell
conda run -n seraphine --no-capture-output python -m uvicorn --app-dir backend app:app --reload
```

### 2. Custom Conda environment name

```powershell
$env:CONDA_ENV_NAME="nama-env"
npm run dev
```

### 3. Non-Conda mode atau interpreter custom

Gunakan Python aktif:

```powershell
$env:USE_CONDA="false"
npm run dev
```

Gunakan interpreter tertentu:

```powershell
$env:BACKEND_PYTHON_CMD="C:\path\to\python.exe"
npm run dev
```

## Build and Deployment

### Build frontend apps

Jalankan build dari root:

```powershell
npm run build
```

Perintah ini akan:

- build storefront ke `web/dist`
- build admin ke `admin/dist`

### Serve build lewat FastAPI

Setelah frontend di-build dan backend dijalankan:

- akses storefront dari root path `/`
- akses admin dari `/control-room`

FastAPI akan otomatis:

- serve `web/dist/index.html` untuk storefront
- serve `admin/dist/index.html` untuk admin
- serve static assets untuk hasil build dan upload image

## Frontend-to-Backend Integration Notes

### Storefront

- Default API base: `http://localhost:8000`
- Vite dev server berjalan di port `4173`
- Proxy `/assets` disediakan oleh Vite saat development

### Admin

- Saat development, admin menggunakan base `/api` lalu diproxy ke backend
- Saat build production-style, admin resolve API ke `${window.location.origin}/api`
- Admin build menggunakan base path `/control-room/`

### Backend API Prefix Support

Backend menerima request baik langsung ke route utama maupun ke route yang diawali `/api/...` karena terdapat middleware rewriting untuk prefix `/api`.

## Feature Details

### Product and Inventory Flow

1. Admin membuat atau mengubah produk melalui dashboard admin.
2. Backend menyimpan data produk ke database.
3. Storefront memuat produk melalui endpoint `GET /products`.
4. Stok divalidasi berdasarkan kombinasi size dan color.
5. Saat checkout sukses, stok pada varian terkait akan dikurangi.

### Order Flow

1. User melakukan login melalui storefront.
2. User menambahkan item ke cart.
3. Backend memvalidasi variant, quantity, shipping service, dan payment method.
4. Backend membuat order dan order items.
5. Admin melihat order yang sama secara live dari endpoint admin.
6. Saat status order berubah, backend dapat membuat notifikasi untuk user.

### Image Upload Flow

1. Admin upload gambar produk melalui endpoint admin.
2. Backend menyimpan file ke `assets/img/`.
3. Backend mengembalikan path dan public URL gambar.
4. Storefront dan admin menggunakan sumber gambar yang sama.

### AI Flow

- `POST /ai/chat` memberikan streaming response untuk chatbot.
- `GET /ai/chat/suggestions` menyediakan suggestion prompt berdasarkan konteks halaman.
- `POST /ai/size-recommend` memberikan rekomendasi ukuran berbasis data ukuran customer dan data produk.
- `GET /ai/health` memeriksa konektivitas AI service.

### IoT Flow

- `POST /iot/simulator/start` memulai simulator IoT.
- `POST /iot/simulator/stop` menghentikan simulator IoT.
- `GET /iot/stream` menyiarkan event real-time via SSE.
- `GET /iot/sensors` menampilkan status sensor.
- `GET /iot/events` menampilkan riwayat event.
- `GET /iot/inventory/snapshot` menampilkan snapshot inventory berbasis RFID.

## Main API Surface

Berikut kelompok endpoint utama yang tersedia saat ini:

### Public and User API

- `GET /products`
- `GET /products/{product_id}`
- `POST /auth/register`
- `POST /auth/login`
- `GET /me/account`
- `PUT /me/account`
- `POST /cart/add`
- `GET /cart`
- `DELETE /cart/{item_id}`
- `POST /cart/clear`
- `POST /wishlist/add`
- `GET /wishlist`
- `DELETE /wishlist/{item_id}`
- `POST /orders/checkout`
- `GET /orders`
- `GET /orders/{order_id}`
- `POST /orders/{order_id}/reviews`
- `GET /me/notifications`
- `PATCH /me/notifications/read`

### Admin API

- `POST /admin/auth/login`
- `GET /admin/access-accounts`
- `POST /admin/access-accounts`
- `PUT /admin/access-accounts/{account_id}`
- `DELETE /admin/access-accounts/{account_id}`
- `GET /admin/products`
- `POST /admin/uploads/images`
- `POST /admin/products`
- `PUT /admin/products/{product_id}`
- `DELETE /admin/products/{product_id}`
- `GET /admin/orders`
- `PATCH /admin/orders/{order_id}`
- `GET /admin/notifications`
- `PATCH /admin/notifications/read`
- `GET /admin/customers`
- `PUT /admin/customers/{user_id}/membership`

### AI and IoT API

- `POST /ai/chat`
- `GET /ai/chat/suggestions`
- `POST /ai/size-recommend`
- `GET /ai/health`
- `POST /iot/simulator/start`
- `POST /iot/simulator/stop`
- `GET /iot/simulator/status`
- `GET /iot/stream`
- `GET /iot/sensors`
- `GET /iot/events`
- `GET /iot/inventory/snapshot`

## Default Development Access

Saat ini source code backend menyediakan fallback demo admin account:

```text
Email    : admin@seraphine.com
Password : password
Role     : Super Admin
```

Catatan:

- Account ini cocok untuk local development atau demo internal.
- Untuk penggunaan lebih serius, buat admin access account baru melalui sistem admin dan ganti secret serta kredensial default.

## Public Access with Ngrok

Jika aplikasi ingin diakses dari internet saat development atau demo, konfigurasi yang paling umum adalah:

1. Jalankan backend di port `8000`.
2. Jalankan storefront di port `4173`.
3. Jalankan admin di port `3101` jika perlu dibagikan.
4. Buat tunnel ngrok untuk service yang ingin diakses publik.
5. Isi `VITE_API_BASE_URL` pada frontend agar mengarah ke URL backend publik.

Contoh:

```powershell
ngrok http 8000
ngrok http 4173
ngrok http 3101
```

Lalu isi misalnya:

```env
VITE_API_BASE_URL=https://your-ngrok-backend-url.ngrok-free.app
```

## Operational Notes and Limitations

- Backend saat ini melakukan penambahan beberapa kolom database secara otomatis saat startup jika kolom belum ada.
- Project masih mengandalkan MySQL sebagai database utama.
- Root build hanya membangun frontend. Deployment backend tetap perlu dijalankan terpisah.
- Fitur AI bergantung pada koneksi keluar ke layanan Gemini.
- Beberapa area seperti laporan lanjutan masih dapat dikembangkan lebih jauh.

## Recommended First Checks When Something Fails

Jika aplikasi tidak berjalan sesuai harapan, periksa urutan berikut:

1. Pastikan MySQL aktif dan database dapat diakses.
2. Pastikan dependency Node.js di `web/` dan `admin/` sudah terpasang.
3. Pastikan dependency Python backend sudah terpasang.
4. Pastikan port `4173`, `3101`, dan `8000` tidak dipakai proses lain.
5. Pastikan `VITE_API_BASE_URL` menunjuk ke backend yang benar.
6. Pastikan `GEMINI_API_KEY` valid jika fitur AI digunakan.

## Repository Status

Dokumen ini disusun ulang agar sesuai dengan kondisi source code proyek pada April 2026.
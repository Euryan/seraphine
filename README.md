# Seraphine Final

Seraphine Final adalah project e-commerce full-stack yang terdiri dari storefront untuk pelanggan, dashboard admin operasional, dan backend API yang menjadi sumber data utama untuk produk, stok, pesanan, pelanggan, wishlist, cart, dan upload gambar produk.

Project ini sudah menggunakan satu alur data yang terhubung:

- produk dibaca dari backend dan dikelola dari admin
- order dari storefront masuk ke backend lalu terlihat di admin
- stok dikelola per varian size/color
- checkout mengurangi stok varian yang benar
- gambar produk dapat diunggah dari admin dan dipakai di storefront

## Ringkasan Arsitektur

```text
Seraphine_final/
|-- admin/                 Dashboard admin (Vite + vanilla JS)
|-- backend/               FastAPI + SQLAlchemy + MySQL
|-- web/                   Storefront customer-facing (Vite + vanilla JS)
|-- scripts/               Helper script untuk menjalankan backend dari root
|-- package.json           Root workspace runner
`-- README.md
```

## Komponen Utama

### `backend/`

Backend berbasis FastAPI yang menangani:

- autentikasi user dengan JWT
- katalog produk dan detail produk
- cart dan wishlist user login
- checkout dan riwayat order
- sinkronisasi stok per varian size/color
- endpoint admin untuk products, orders, customers
- upload gambar produk ke `assets/img`

File penting:

- [backend/app.py](backend/app.py)
- [backend/database.py](backend/database.py)
- [backend/models.py](backend/models.py)
- [backend/product_catalog.py](backend/product_catalog.py)
- [backend/requirements.txt](backend/requirements.txt)

### `web/`

Frontend customer-facing untuk pengalaman belanja. Stack yang dipakai:

- Vite
- Tailwind CSS
- vanilla JavaScript modular

Fitur utama web saat ini:

- browse produk dari backend
- detail produk dengan pemilihan size dan color
- cart dan wishlist hanya untuk user login
- checkout yang tervalidasi dengan stok backend
- penyesuaian quantity otomatis jika stok tersisa kurang dari quantity yang diminta
- order history user

File penting:

- [web/index.html](web/index.html)
- [web/main.js](web/main.js)
- [web/style.css](web/style.css)
- [web/js/data.js](web/js/data.js)
- [web/js/logic.js](web/js/logic.js)
- [web/js/pages.js](web/js/pages.js)
- [web/js/state.js](web/js/state.js)
- [web/package.json](web/package.json)
- [web/vite.config.ts](web/vite.config.ts)

### `admin/`

Frontend dashboard admin untuk operasi toko. Admin sekarang tidak lagi memakai mock data untuk katalog utama, order, dan customer list. Data utamanya berasal dari backend.

Fitur utama admin saat ini:

- dashboard operasional dengan analytics live
- CRUD produk
- manajemen stok per varian size/color
- upload gambar produk
- monitoring order dan update status order
- daftar pelanggan dari data order/user backend
- export CSV untuk beberapa modul

Catatan penting:

- login admin saat ini masih bersifat demo/local di sisi frontend admin
- data dashboard, produk, order, dan customer sudah live ke backend

File penting:

- [admin/index.html](admin/index.html)
- [admin/src/script.js](admin/src/script.js)
- [admin/src/modules/dashboard.js](admin/src/modules/dashboard.js)
- [admin/src/modules/products.js](admin/src/modules/products.js)
- [admin/src/modules/orders.js](admin/src/modules/orders.js)
- [admin/src/modules/customers.js](admin/src/modules/customers.js)
- [admin/src/modules/data.js](admin/src/modules/data.js)
- [admin/package.json](admin/package.json)
- [admin/vite.config.js](admin/vite.config.js)

## Teknologi yang Digunakan

### Backend

- FastAPI
- SQLAlchemy
- MySQL + PyMySQL
- python-jose
- passlib
- uvicorn

### Frontend

- Vite
- Tailwind CSS
- vanilla JavaScript

### Workspace / Tooling

- Node.js
- npm workspaces sederhana melalui root scripts
- `concurrently` untuk menjalankan semua service sekaligus

## Port Development

- Storefront web: `http://localhost:3000`
- Admin dashboard: `http://localhost:3101`
- Backend API: `http://localhost:8000`

## Database dan Environment

Backend menggunakan MySQL melalui environment variable `SQLALCHEMY_DATABASE_URL`.

Default fallback di [backend/database.py](backend/database.py) adalah:

```env
mysql+pymysql://root:@localhost/seraphine_db
```

Artinya, jika Anda tidak mengisi environment variable, backend akan mencoba terkoneksi ke database MySQL lokal bernama `seraphine_db` dengan user `root` tanpa password.

Contoh override di PowerShell:

```powershell
$env:SQLALCHEMY_DATABASE_URL="mysql+pymysql://root:password@localhost/seraphine_db"
```

## Cara Menjalankan

### Opsi 1: Jalankan semua service dari root

Instal dependency Node.js terlebih dahulu:

```powershell
cd Seraphine_final
npm install
npm --prefix web install
npm --prefix admin install
```

Siapkan dependency Python backend di environment yang Anda gunakan:

```powershell
cd backend
pip install -r requirements.txt
pip install bcrypt==4.0.1
cd ..
```

Lalu jalankan semua service:

```powershell
npm run dev
```

Root runner akan menjalankan:

- web via [web/package.json](web/package.json)
- admin via [admin/package.json](admin/package.json)
- backend via [scripts/run-backend.cjs](scripts/run-backend.cjs)

### Opsi 2: Jalankan per aplikasi

#### Backend

```powershell
cd backend
pip install -r requirements.txt
pip install bcrypt==4.0.1
uvicorn app:app --reload
```

#### Web

```powershell
cd web
npm install
npm run dev
```

#### Admin

```powershell
cd admin
npm install
npm run dev
```

## Konfigurasi Launcher Backend Root

Root script [scripts/run-backend.cjs](scripts/run-backend.cjs) mendukung tiga mode:

1. Default Conda

	Script akan menjalankan backend dengan:

	```powershell
	conda run -n seraphine python -m uvicorn --app-dir backend app:app --reload
	```

2. Nama environment Conda berbeda

	```powershell
	$env:CONDA_ENV_NAME="nama-env"
	npm run dev
	```

3. Tidak memakai Conda

	Gunakan Python aktif:

	```powershell
	$env:USE_CONDA="false"
	npm run dev
	```

	Atau gunakan interpreter tertentu:

	```powershell
	$env:BACKEND_PYTHON_CMD="C:\path\to\python.exe"
	npm run dev
	```

## Fitur yang Sudah Ada

### Storefront

- katalog produk dari backend
- detail produk per size dan color
- cart dan wishlist berbasis akun login
- checkout dengan validasi stok backend
- auto-adjust quantity jika stok kurang
- riwayat order user
- invalid session cleanup untuk token kadaluarsa

### Admin

- analytics dashboard operasional
- quick actions antar modul
- top products, top clients, dan low-stock alerts
- CRUD produk live
- stock editor per varian
- upload gambar produk ke backend assets
- daftar dan detail order
- update status order
- daftar customer dari backend

### Backend

- register dan login user
- cart dan wishlist API
- checkout API
- order serialization untuk storefront dan admin
- admin products API
- admin orders API
- admin customers API
- static serving untuk gambar di `/assets`

## Alur Data Inti

### Produk dan stok

1. Produk dibuat atau diubah dari admin.
2. Backend menyimpan data produk ke database.
3. Storefront memuat produk dari endpoint `/products`.
4. Stok dihitung dan divalidasi per kombinasi `size + color`.
5. Saat checkout berhasil, backend mengurangi stok hanya pada varian yang dibeli.

### Order

1. User login di storefront.
2. User menambahkan produk ke cart.
3. Checkout dikirim ke backend.
4. Backend membuat order dan order items.
5. Admin melihat order yang sama dari endpoint admin.

### Gambar produk

1. Admin upload gambar dari dashboard.
2. Backend menyimpan file ke `assets/img`.
3. URL gambar diserialisasi dari backend.
4. Storefront dan admin memakai sumber gambar yang sama.

## Status dan Batasan Saat Ini

- admin login masih demo/local, belum role-based auth dari backend
- modul `Reports` di admin masih placeholder
- project memakai MySQL lokal atau server MySQL yang kompatibel
- file generated seperti `web/dist`, `admin/dist`, dan `web/.vite` bukan source utama project

## File dan Folder yang Perlu Diketahui

- [package.json](package.json): runner utama root workspace
- [scripts/run-backend.cjs](scripts/run-backend.cjs): launcher backend lintas-environment
- [assets/img](assets/img): lokasi file upload gambar produk
- [backend/database.py](backend/database.py): konfigurasi koneksi database
- [backend/product_catalog.py](backend/product_catalog.py): helper katalog dan stok varian

## Catatan Tambahan

- Base URL API storefront dan admin saat ini mengarah ke `http://localhost:8000`
- Jika `npm run dev` dari root gagal, biasanya penyebabnya adalah dependency frontend belum di-install, MySQL belum aktif, atau launcher backend tidak menemukan interpreter yang sesuai
- README ini menggambarkan status project saat ini, bukan struktur lama ketika admin masih mock atau storefront masih berada di root repo

Last Updated: April 5, 2026
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Frontend Admin

Folder ini berisi dashboard admin Seraphine yang terpisah dari storefront utama, tetapi sudah terhubung ke backend live untuk katalog produk, order, customer, dan upload gambar.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies dengan `npm install`
2. Jalankan development server dengan `npm run dev`

Admin frontend default berjalan di `http://localhost:3101`.

## Current Scope

- dashboard analytics operasional
- CRUD produk
- variant stock management per size/color
- order monitoring dan status update
- customer list
- image upload ke backend

## Important Note

Autentikasi admin saat ini masih berupa demo login di frontend admin. Namun data produk, order, dan customer yang ditampilkan sudah berasal dari backend live.

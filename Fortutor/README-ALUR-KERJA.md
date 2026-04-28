# README Alur Kerja Seraphine Final

Dokumen ini dibuat sebagai referensi presentasi teknis. Fokusnya bukan ringkasan proyek, tetapi alur kerja detail dari fitur utama yang benar-benar berjalan di source code saat ini: login, register, produk, add stock, edit stock, checkout, order, customer membership, notifikasi, AI, IoT, dan database.

Dokumen ini disusun berdasarkan implementasi di folder:

- `backend/`
- `web/`
- `admin/`

## 1. Gambaran Arsitektur

Seraphine Final terdiri dari 3 lapisan utama:

1. `web/`
   Frontend customer storefront.
2. `admin/`
   Frontend dashboard admin.
3. `backend/`
   API server FastAPI + SQLAlchemy + MySQL.

Alur komunikasi utamanya seperti ini:

```text
Customer Web/Admin UI
        -> fetch() / FormData / JSON / x-www-form-urlencoded
        -> FastAPI endpoint
        -> SQLAlchemy ORM
        -> MySQL
        -> response JSON
        -> state frontend diperbarui
        -> UI dirender ulang
```

Komponen inti:

- `backend/app.py`: pusat endpoint bisnis utama.
- `backend/models.py`: definisi tabel database.
- `backend/database.py`: koneksi engine dan session SQLAlchemy.
- `backend/product_catalog.py`: logika stok per varian, serialisasi produk, dan seed data.
- `web/js/logic.js`: alur aksi customer seperti register, login, cart, wishlist, checkout.
- `admin/src/modules/data.js`: adapter request admin ke backend.
- `admin/src/modules/products.js`: UI add product, upload image, dan edit stok varian.

## 2. Sintaks dan Pola yang Dipakai

Sebelum masuk ke alur fitur, ini sintaks inti yang dipakai proyek.

### 2.1 FastAPI Route Decorator

Contoh sintaks:

```python
@app.post("/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    ...
```

Maknanya:

- `@app.post(...)` membuat endpoint HTTP POST.
- `response_model=Token` memaksa bentuk response mengikuti model `Token`.
- `Depends(database.get_db)` menyuntikkan koneksi database per request.

### 2.2 Pydantic Model

Contoh:

```python
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
```

Maknanya:

- request body JSON harus punya field sesuai model.
- validasi tipe dilakukan otomatis oleh FastAPI.

### 2.3 SQLAlchemy Query

Contoh:

```python
db.query(models.User).filter(models.User.email == normalized_email).first()
```

Maknanya:

- membaca data dari tabel `users`.
- `filter(...)` memberi kondisi SQL.
- `first()` mengambil 1 baris pertama atau `None`.

### 2.4 Hash Password

Sintaks:

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed_password = pwd_context.hash(password)
pwd_context.verify(plain_password, hashed_password)
```

Maknanya:

- password tidak disimpan mentah.
- password register/admin account di-hash dengan bcrypt.

### 2.5 JWT Token

Sintaks:

```python
encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
```

Maknanya:

- backend membuat token login customer.
- token dikirim lagi di header `Authorization: Bearer ...` untuk endpoint privat.

### 2.6 Fetch API di Frontend

Contoh JSON request:

```javascript
await fetch(`${API_BASE}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, email, password }),
});
```

Contoh form login OAuth2 style:

```javascript
const formData = new URLSearchParams();
formData.append('username', username);
formData.append('password', password);

await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  body: formData,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});
```

Contoh upload file:

```javascript
const formData = new FormData();
formData.append('file', file);

await fetch(`${API_BASE}/admin/uploads/images`, {
  method: 'POST',
  body: formData,
});
```

## 3. Struktur Database

Database didefinisikan di `backend/models.py` dan koneksinya di `backend/database.py`.

### 3.1 Tabel Inti

#### `products`

Menyimpan katalog produk.

Field penting:

- `id`
- `sku`
- `name`
- `category`
- `description`
- `price`
- `stock`
- `images_json`
- `sizes_json`
- `colors_json`
- `variant_stock_json`
- `rating`
- `reviews`

Catatan penting:

- data array disimpan sebagai JSON string.
- stok total disinkronkan dari `variant_stock_json`.

#### `users`

Menyimpan akun customer.

Field penting:

- `username`
- `email`
- `hashed_password`
- `profile_json`
- `address_json`
- `measurements_json`
- `preferences_json`
- `membership_active`
- `membership_rfid_uid`

#### `admin_access_accounts`

Menyimpan akun admin non-demo.

Field penting:

- `name`
- `email`
- `hashed_password`
- `role`
- `is_active`

#### `cart_items`

Menyimpan isi keranjang per user dan per varian.

Field penting:

- `user_id`
- `product_id`
- `size`
- `color`
- `quantity`

#### `wishlist_items`

Menyimpan wishlist customer.

#### `orders`

Menyimpan header transaksi checkout.

Field penting:

- `user_id`
- `shipping_first_name`
- `shipping_last_name`
- `shipping_email`
- `shipping_phone`
- `shipping_address`
- `shipping_city`
- `shipping_province`
- `shipping_postal_code`
- `shipping_service`
- `shipping_fee`
- `payment_method`
- `payment_last4`
- `status`
- `total_amount`

#### `order_items`

Menyimpan detail item pesanan per produk dan per varian.

#### `product_reviews`

Menyimpan review setelah order selesai.

#### `notifications`

Menyimpan notifikasi untuk admin dan user.

## 4. Inisialisasi Database Saat Backend Start

Saat `backend/app.py` dijalankan:

### 4.1 Membuat tabel

Sintaks:

```python
models.Base.metadata.create_all(bind=database.engine)
```

Artinya:

- jika tabel belum ada, SQLAlchemy akan membuat tabel dari model.

### 4.2 Menambah kolom tambahan bila perlu

Fungsi `ensure_size_columns()` melakukan bootstrap kolom seperti:

- `size`, `color` pada `cart_items`
- `variant_stock_json` pada `products`
- shipping fields pada `orders`
- profile/address/measurement/preferences pada `users`

Sintaks yang dipakai:

```python
connection.execute(text("ALTER TABLE ..."))
```

Ini berarti backend mencoba menyesuaikan struktur database saat startup tanpa migrasi tool terpisah.

### 4.3 Seed produk default

Sintaks:

```python
with database.SessionLocal() as seed_db:
    product_catalog.seed_products(seed_db)
```

Artinya:

- jika tabel produk kosong, backend akan memasukkan produk contoh dari `DEFAULT_PRODUCTS`.

## 5. Alur Register Customer

Implementasi utama:

- Frontend: `web/js/logic.js` pada fungsi `handleRegister`
- Backend: `backend/app.py` pada endpoint `POST /auth/register`

### 5.1 Alur dari UI

Customer mengisi form register:

- `username`
- `email`
- `password`

Frontend mengirim JSON:

```json
{
  "username": "rizki",
  "email": "rizki@mail.com",
  "password": "rahasia123"
}
```

Sintaks request:

```javascript
const data = await apiJson(`${API_BASE}/auth/register`, {
  method: 'POST',
  body: JSON.stringify({ username, email, password }),
});
```

### 5.2 Proses di Backend

Endpoint:

```python
@app.post("/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(database.get_db)):
```

Langkah backend:

1. Memeriksa apakah username sudah ada dengan `get_user(db, user.username)`.
2. Jika ada, backend melempar `HTTPException(status_code=400, detail="Username already registered")`.
3. Password di-hash menggunakan `get_password_hash(user.password)`.
4. User baru dibuat ke tabel `users`.
5. Backend `commit()` lalu `refresh()`.
6. Backend membuat JWT dengan `create_access_token(data={"sub": user.username})`.
7. Response dikirim dalam bentuk token.

Response sukses:

```json
{
  "access_token": "<jwt-token>",
  "token_type": "bearer"
}
```

### 5.3 Setelah Register di Frontend

Frontend melakukan:

```javascript
state.user = { username, email };
state.token = data.access_token;
state.cart = [];
state.wishlist = [];
state.orders = [];
```

Lalu frontend memanggil ulang data akun:

- `fetchAccountProfile()`
- `fetchCart()`
- `fetchWishlist()`
- `fetchOrders()`
- `executePendingAuthAction()`

Maknanya:

- user langsung dianggap login setelah register.
- token disimpan di state frontend.
- jika sebelumnya user menekan wishlist/cart tetapi belum login, aksi itu bisa dijalankan ulang otomatis.

## 6. Alur Login Customer

Implementasi utama:

- Frontend: `web/js/logic.js` pada fungsi `handleLogin`
- Backend: `backend/app.py` pada endpoint `POST /auth/login`

### 6.1 Bentuk Request

Berbeda dari register, login customer memakai format `application/x-www-form-urlencoded` karena backend memakai `OAuth2PasswordRequestForm`.

Sintaks frontend:

```javascript
const formData = new URLSearchParams();
formData.append('username', username);
formData.append('password', password);
```

Lalu dikirim ke:

```javascript
await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});
```

### 6.2 Proses di Backend

Endpoint:

```python
@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
```

Langkah backend:

1. `authenticate_user(db, form_data.username, form_data.password)` dijalankan.
2. `authenticate_user` mengambil user dari tabel `users`.
3. Password diverifikasi dengan `verify_password(password, user.hashed_password)`.
4. Jika gagal, backend mengirim `401 Incorrect username or password`.
5. Jika berhasil, backend membuat JWT dengan masa berlaku sesuai `ACCESS_TOKEN_EXPIRE_MINUTES`.
6. Token dikirim ke frontend.

### 6.3 Akses Endpoint Privat Setelah Login

Setelah login, frontend akan mengirim header seperti ini:

```javascript
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${state.token}`
}
```

Di backend, token dibaca oleh:

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
```

Fungsi ini:

1. decode JWT.
2. mengambil `sub` sebagai username.
3. mencari user ke database.
4. jika valid, endpoint privat bisa dijalankan.

## 7. Alur Login Admin

Implementasi utama:

- Frontend: `admin/src/script.js`
- Adapter API: `admin/src/modules/data.js`
- Backend: `POST /admin/auth/login`

### 7.1 Request dari Frontend Admin

Sintaks:

```javascript
await authenticateAdmin(email, password)
```

Isi fungsi:

```javascript
return apiJson('/admin/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
```

Payload:

```json
{
  "email": "admin@seraphine.com",
  "password": "password"
}
```

### 7.2 Proses di Backend

Endpoint:

```python
@app.post("/admin/auth/login")
def admin_login(payload: AdminLoginPayload, db: Session = Depends(database.get_db)):
```

Backend menjalankan:

```python
account = authenticate_admin_access_account(db, payload.email, payload.password)
```

Cabang logika:

1. Jika email/password sama dengan demo account:
   - `admin@seraphine.com / password`
   - backend mengembalikan akun demo bawaan.
2. Jika bukan demo account:
   - backend mencari di tabel `admin_access_accounts`.
   - memastikan `is_active == True`.
   - password diverifikasi via bcrypt.

Jika gagal:

```python
raise HTTPException(status_code=401, detail="Invalid admin credentials")
```

### 7.3 Penyimpanan Sesi Admin

Berbeda dari customer, sesi admin saat ini disimpan di localStorage browser admin:

```javascript
db.set('session', {
  user: account.name,
  email: account.email,
  role: account.role,
  source: account.source,
});
```

Jadi:

- validasi akun admin tetap dilakukan server.
- tetapi dashboard admin tidak memakai JWT seperti customer.
- state login admin bersifat client-side session untuk panel admin.

## 8. Alur Create Admin Access Account

Implementasi utama:

- Frontend admin: `admin/src/modules/customer-service.js`
- Backend: `POST /admin/access-accounts`

Payload yang dikirim:

```json
{
  "name": "CS Team 1",
  "email": "cs1@seraphine.com",
  "password": "abcd1234",
  "role": "Customer Service",
  "active": true
}
```

Langkah backend:

1. normalisasi email dengan `normalize_email`.
2. validasi nama tidak kosong.
3. validasi email demo tidak boleh dipakai ulang.
4. cek apakah email sudah terdaftar.
5. cek panjang password minimal 4 karakter.
6. hash password.
7. simpan ke tabel `admin_access_accounts`.

## 9. Alur Ambil Daftar Produk

Endpoint customer dan admin sama-sama mengambil data dari database backend.

Endpoint:

- `GET /products`
- `GET /admin/products`

Keduanya memakai helper:

```python
build_product_list_response(db)
```

Helper tersebut:

1. menghitung produk terjual dari order berstatus `completed`.
2. mengambil daftar produk.
3. mengambil review terbaru per produk.
4. men-serialize produk dengan `product_catalog.serialize_product(...)`.

Response produk bukan hanya field dasar, tetapi juga:

- `variantStocks`
- `soldCount`
- `reviewEntries`
- `isFeatured`
- `isNew`

## 10. Alur Add Product

Implementasi utama:

- UI admin: `admin/src/modules/products.js`
- API admin: `POST /admin/products`

### 10.1 Input dari Modal Admin

Admin mengisi:

- `name`
- `category`
- `price`
- `sizes`
- `colors`
- `image`
- `description`
- `variantStocks`

Contoh payload final yang disusun frontend:

```json
{
  "sku": "SRF-123456",
  "name": "New Dress",
  "category": "Apparel",
  "price": 1250,
  "stock": 12,
  "sizes": ["S", "M", "L"],
  "colors": ["Black", "Gold"],
  "variantStocks": [
    { "size": "S", "color": "Black", "stock": 2 },
    { "size": "S", "color": "Gold", "stock": 2 },
    { "size": "M", "color": "Black", "stock": 3 },
    { "size": "M", "color": "Gold", "stock": 2 },
    { "size": "L", "color": "Black", "stock": 2 },
    { "size": "L", "color": "Gold", "stock": 1 }
  ],
  "images": ["http://localhost:8000/assets/img/example.png"],
  "description": "Deskripsi produk",
  "isFeatured": false,
  "isNew": false,
  "rating": 0,
  "reviews": 0
}
```

### 10.2 Cara Stok Total Dibentuk

Di frontend admin:

```javascript
const stock = variantStocks.reduce((sum, variant) => sum + variant.stock, 0);
```

Artinya:

- stok total tidak diinput manual.
- stok total adalah hasil penjumlahan semua stok varian.

### 10.3 Proses di Backend

Endpoint:

```python
@app.post("/admin/products")
def admin_create_product(payload: ProductPayload, db: Session = Depends(database.get_db)):
```

Langkah backend:

1. mencari `id` numerik berikutnya.
2. membuat object `models.Product(id=next_id)`.
3. memanggil `apply_product_payload(product, payload)`.
4. commit ke database.
5. mengembalikan produk yang sudah diserialisasi.

### 10.4 Fungsi `apply_product_payload`

Ini fungsi kunci untuk add product dan edit product.

Fungsi ini:

1. membangun ulang `variant_stocks` via `product_catalog.build_variant_stocks(...)`.
2. mengisi `sku`, `name`, `category`, `description`, `price`.
3. menyimpan array sebagai JSON string:
   - `images_json`
   - `sizes_json`
   - `colors_json`
   - `variant_stock_json`
4. menyinkronkan `product.stock` dari total stok varian.

Jadi akar logika stok ada di fungsi ini.

## 11. Alur Upload Gambar Produk

Implementasi utama:

- Frontend admin: `uploadProductImage(file)`
- Backend: `POST /admin/uploads/images`

### 11.1 Frontend

```javascript
const formData = new FormData();
formData.append('file', file);
```

Lalu request dikirim tanpa `Content-Type` manual, karena browser akan mengisi boundary multipart otomatis.

### 11.2 Backend

Endpoint:

```python
@app.post("/admin/uploads/images")
async def admin_upload_product_image(request: Request, file: UploadFile = File(...)):
```

Langkah backend:

1. validasi filename ada.
2. sanitasi nama file dengan `sanitize_filename`.
3. validasi extension termasuk `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`.
4. membuat nama unik dengan `uuid4()`.
5. menyimpan file ke folder `assets/img`.
6. membentuk URL publik seperti:

```text
/assets/img/<filename>
```

Response:

```json
{
  "filename": "dress-abc123.png",
  "path": "/assets/img/dress-abc123.png",
  "url": "http://localhost:8000/assets/img/dress-abc123.png"
}
```

## 12. Alur Add Stock dan Edit Stock

Di sistem ini, add stock dan edit stock bukan endpoint terpisah. Keduanya dilakukan lewat edit product dengan memodifikasi `variantStocks`.

### 12.1 Di UI Admin

Pada modal produk, admin mengatur stock per kombinasi size/color.

Contoh varian:

- S / Black
- S / Gold
- M / Black
- M / Gold

Setiap input stock diberi atribut:

```html
data-size="S"
data-color="Black"
data-variant-key="S::Black"
```

Lalu frontend mengumpulkan nilai:

```javascript
const variantStocks = Array.from(variantGrid.querySelectorAll('[data-variant-key]')).map((input) => ({
  size: input.dataset.size || null,
  color: input.dataset.color || null,
  stock: Number(input.value || 0),
}));
```

### 12.2 Add Stock

Add stock terjadi ketika admin menaikkan angka stok varian tertentu.

Contoh:

- sebelumnya `M / Black = 3`
- diubah menjadi `M / Black = 8`

Maka saat `PUT /admin/products/{product_id}` dipanggil, backend akan menyimpan angka baru itu ke `variant_stock_json` dan menghitung ulang `stock` total.

### 12.3 Edit Stock

Edit stock adalah perubahan angka stok varian, baik naik maupun turun.

Contoh:

- `L / Gold = 2` menjadi `1`
- atau `1` menjadi `0`

Karena logika disatukan, edit stock memakai endpoint yang sama dengan edit product.

### 12.4 Endpoint yang Dipakai

```python
@app.put("/admin/products/{product_id}")
def admin_update_product(product_id: str, payload: ProductUpdatePayload, db: Session = Depends(database.get_db)):
```

Langkah backend:

1. mencari produk berdasarkan `product_id`.
2. jika tidak ada, return `404`.
3. menjalankan `apply_product_payload(product, payload)`.
4. `commit()` dan `refresh()`.
5. mengembalikan data produk terbaru.

### 12.5 Fungsi Perhitungan Stok Varian

Di `backend/product_catalog.py`, ada fungsi:

```python
def build_variant_stocks(sizes, colors, total_stock, existing_variant_stocks=None):
```

Fungsi ini bertugas:

1. membuat seluruh kombinasi size-color.
2. jika ada `existing_variant_stocks`, nilai stok lama dipakai.
3. jika belum ada, stok awal didistribusikan ke kombinasi varian.

Lalu total stok dihitung dengan:

```python
def get_total_stock_from_variants(variant_stocks):
    return sum(max(int(variant.get("stock", 0)), 0) for variant in variant_stocks)
```

## 13. Alur Add to Cart

Implementasi utama:

- Frontend: `addToCart(productId)`
- Backend: `POST /cart/add`

### 13.1 Validasi di Frontend

Sebelum request dikirim:

1. size harus dipilih.
2. jika produk punya lebih dari satu warna, color harus dipilih.
3. jika user belum login:
   - aksi disimpan sebagai `pendingAuthAction`
   - user diarahkan ke halaman login.

### 13.2 Request ke Backend

Payload:

```json
{
  "product_id": "1",
  "quantity": 1,
  "size": "M",
  "color": "Black"
}
```

### 13.3 Proses Backend

Langkah backend:

1. cari produk.
2. validasi size dengan `product_catalog.is_valid_size(...)`.
3. validasi color dengan `product_catalog.is_valid_color(...)`.
4. cek apakah item varian itu sudah ada di cart user.
5. ambil stok varian dengan `product_catalog.get_variant_stock(product, item.size, item.color)`.
6. hitung quantity akhir:

```python
target_quantity = min(current_quantity + max(item.quantity, 0), max(available_quantity, 0))
```

Artinya:

- quantity di cart tidak boleh melebihi stok varian tersedia.

Jika stok habis:

```python
raise HTTPException(status_code=400, detail="Variant stok habis")
```

## 14. Alur Checkout

Implementasi utama:

- Frontend: `handleCheckout(form)`
- Backend: `POST /orders/checkout`

### 14.1 Validasi Frontend Sebelum Checkout

Frontend melakukan:

1. memastikan user login.
2. memuat ulang produk terbaru dengan `loadProducts()`.
3. menyinkronkan cart terhadap stok terbaru lewat `syncCartQuantitiesWithStock()`.
4. memastikan cart tidak kosong.
5. memastikan semua item punya size.
6. memastikan item dengan multi color punya color.
7. memastikan data pengiriman lengkap.
8. memastikan referensi pembayaran minimal 4 karakter jika bukan COD.

### 14.2 Payload Checkout

Contoh payload:

```json
{
  "first_name": "Rizki",
  "last_name": "Saputra",
  "email": "rizki@mail.com",
  "phone": "08123456789",
  "address": "Jl. Merdeka No. 1",
  "city": "Bandung",
  "province": "Jawa Barat",
  "postal_code": "40111",
  "shipping_service": "jne-reg",
  "delivery_notes": "Titip satpam",
  "payment_method": "bank-transfer",
  "payment_last4": "4321",
  "items": [
    {
      "product_id": "1",
      "size": "M",
      "color": "Black",
      "quantity": 2
    }
  ],
  "total_amount": 4900
}
```

Catatan:

- `total_amount` dikirim frontend, tetapi backend tetap menghitung ulang total final.

### 14.3 Proses Backend Saat Checkout

Langkah detail:

1. validasi `shipping_service` terhadap `SHIPPING_SERVICE_FEES`.
2. validasi `payment_method` terhadap `PAYMENT_METHOD_LABELS`.
3. loop semua item checkout.
4. untuk setiap item:
   - cari produk
   - validasi size/color
   - validasi quantity >= 1
   - panggil `clamp_quantity_to_stock(...)`
5. `clamp_quantity_to_stock` menentukan quantity final yang boleh diproses.
6. jika stok nol, checkout ditolak.
7. backend hitung `computed_total` dari harga produk di database.
8. backend membuat row `orders`.
9. backend membuat notifikasi admin `new-order`.
10. backend membuat row `order_items`.
11. backend mengurangi stok varian dengan:

```python
product_catalog.update_variant_stock(item["product"], item["size"], item["color"], -item["quantity"])
```

12. backend menghapus semua item cart user.
13. backend `commit()`.

Response sukses:

```json
{
  "message": "Order placed successfully",
  "order_id": 15,
  "status": "pending",
  "shipping_fee": 12.0,
  "adjustments": []
}
```

### 14.4 Dampak ke Database

Saat checkout sukses, tabel yang berubah adalah:

- `orders` bertambah 1 row
- `order_items` bertambah beberapa row
- `products.variant_stock_json` berkurang
- `products.stock` ikut berkurang
- `cart_items` untuk user tersebut dihapus
- `notifications` bertambah 1 row untuk admin

## 15. Alur Order History Customer

Endpoint:

```python
@app.get("/orders")
```

Langkah backend:

1. mengambil order milik user saat ini.
2. mengurutkan dari terbaru.
3. mengambil review map bila ada.
4. men-serialize order dengan `serialize_order(...)`.

Struktur item order yang dikirim termasuk:

- `product_id`
- `size`
- `color`
- `quantity`
- `price`
- `review`
- `reviewEligible`

## 16. Alur Review Produk

Endpoint:

```python
@app.post("/orders/{order_id}/reviews")
```

Syarat agar review bisa masuk:

1. rating 1 sampai 5.
2. order milik user login.
3. status order harus `completed`.
4. `order_item_id` harus valid.
5. item belum pernah direview.

Setelah review disimpan, backend memanggil:

```python
refresh_product_rating(db, order_item.product_id)
```

Fungsi ini menghitung ulang:

- jumlah review
- rata-rata rating

Lalu menyimpan hasilnya ke tabel `products`.

## 17. Alur Update Status Order oleh Admin

Implementasi utama:

- Frontend admin: `updateOrderStatus(orderId, status)`
- Backend: `PATCH /admin/orders/{order_id}`

Payload:

```json
{
  "status": "shipped"
}
```

Backend melakukan:

1. cari order berdasarkan id.
2. validasi status harus termasuk:
   - `pending`
   - `paid`
   - `shipped`
   - `completed`
   - `cancelled`
3. simpan status baru.
4. jika status berubah, buat notifikasi untuk user.

Sintaks notifikasi:

```python
create_notification(
    db,
    audience="user",
    user_id=order.user_id,
    order_id=order.id,
    type="order-status-updated",
    ...
)
```

## 18. Alur Customer Membership dan RFID

Implementasi utama:

- Frontend admin: `updateCustomerMembership(customerId, payload)`
- Backend: `PUT /admin/customers/{user_id}/membership`

Payload:

```json
{
  "active": true,
  "rfidUid": "RFID-001-ABCD"
}
```

Langkah backend:

1. cari user.
2. normalisasi UID dengan `normalize_membership_uid`.
3. jika membership aktif tapi UID kosong, tolak request.
4. cek UID tidak sedang dipakai customer lain.
5. set `membership_active`.
6. set `membership_rfid_uid`.
7. set `membership_joined_at` saat pertama kali aktif.
8. `commit()`.

Data customer yang dikirim admin dibangun oleh `serialize_customer(user)` dan juga menyertakan:

- `totalOrders`
- `totalSpend`
- `tier`
- `membershipActive`
- `membershipRfidUid`

Tier dihitung dari total belanja:

- `Bronze`
- `Silver`
- `Gold`
- `Noir`

## 19. Alur Notifikasi

Sistem notifikasi menggunakan tabel `notifications`.

### 19.1 Notifikasi Admin

Dibuat saat checkout sukses.

Contoh event:

- type: `new-order`

Frontend admin memanggil:

- `fetchAdminNotifications()` -> `GET /admin/notifications`
- `markAdminNotificationsRead()` -> `PATCH /admin/notifications/read`

Admin dashboard melakukan polling tiap 20 detik.

### 19.2 Notifikasi User

Dibuat saat status order diubah admin.

Frontend customer memanggil:

- `GET /me/notifications`
- `PATCH /me/notifications/read`

## 20. Alur Profil, Alamat, Preferensi, dan Ukuran Customer

Semua data ini disimpan di tabel `users` sebagai JSON string:

- `profile_json`
- `address_json`
- `measurements_json`
- `preferences_json`

Backend menggunakan fungsi:

```python
update_user_account(user, payload)
```

Pola kerjanya:

1. mengambil struktur default akun.
2. merge dengan data lama user.
3. merge lagi dengan perubahan baru.
4. simpan kembali ke kolom JSON.

Keuntungan pendekatan ini:

- perubahan data account fleksibel.
- tidak perlu terlalu banyak kolom tabel terpisah.

## 21. Alur AI Chat dan Size Recommendation

Implementasi utama:

- `backend/chat_routes.py`
- `backend/ai_service.py`

### 21.1 AI Chat

Endpoint:

```python
@router.post("/chat")
```

Request berisi:

- `message`
- `conversation_history`
- `page_context`

Backend:

1. mengambil data produk dengan `_serialize_products(db)`.
2. memanggil `ai_service.stream_chat_response(...)`.
3. mengirim balasan dengan `StreamingResponse` format SSE.

Format output SSE:

```text
data: {"token": "..."}

data: {"done": true}
```

### 21.2 Size Recommendation

Endpoint:

```python
@router.post("/size-recommend")
```

Payload utama:

```json
{
  "product_id": "1",
  "measurements": {
    "height_cm": 170,
    "weight_kg": 60,
    "chest_cm": 90,
    "waist_cm": 72,
    "hip_cm": 95,
    "preferences": "regular"
  }
}
```

Backend:

1. mencari produk.
2. membangun object `product_data`.
3. memanggil `ai_service.get_size_recommendation(...)`.
4. mengembalikan hasil rekomendasi ukuran.

## 22. Alur IoT Monitoring

Implementasi utama:

- `backend/iot_routes.py`
- `backend/iot_simulator.py`
- `admin/src/modules/iot-dashboard.js`

Endpoint penting:

- `POST /iot/simulator/start`
- `POST /iot/simulator/stop`
- `GET /iot/simulator/status`
- `GET /iot/stream`
- `GET /iot/sensors`
- `GET /iot/events`
- `GET /iot/inventory/snapshot`

Alur stream real-time:

1. admin membuka halaman IoT Monitor.
2. frontend subscribe ke `GET /iot/stream`.
3. backend mengambil queue dari simulator.
4. event dikirim sebagai SSE.
5. frontend memperbarui feed event, sensor card, dan statistik stock in/out.

## 23. Perbedaan Penyimpanan State Customer vs Admin

### Customer storefront

- token login: ada, berbasis JWT
- endpoint privat: dilindungi `Bearer token`
- cart/wishlist/order: source of truth di backend setelah login

### Admin dashboard

- tidak memakai JWT
- validasi login dilakukan backend
- session disimpan di localStorage admin
- data produk/order/customer tetap source of truth di backend

## 24. Ringkasan Alur per Fitur untuk Presentasi

### 24.1 Register

UI register -> `POST /auth/register` -> cek user -> hash password -> simpan ke `users` -> buat JWT -> frontend simpan token -> load profil/cart/order.

### 24.2 Login customer

UI login -> `POST /auth/login` form-urlencoded -> verifikasi bcrypt -> buat JWT -> frontend simpan token -> endpoint privat aktif.

### 24.3 Login admin

UI admin -> `POST /admin/auth/login` -> cek demo account atau `admin_access_accounts` -> jika valid simpan session ke localStorage admin.

### 24.4 Add product

Modal admin -> susun `variantStocks` -> hitung `stock` total -> `POST /admin/products` -> `apply_product_payload` -> simpan ke `products`.

### 24.5 Add stock / edit stock

Admin ubah angka stok per varian -> `PUT /admin/products/{id}` -> backend bangun ulang `variant_stock_json` -> `stock` total ikut dihitung ulang.

### 24.6 Add to cart

Customer pilih size/color -> `POST /cart/add` -> validasi varian -> batasi quantity sesuai stok -> simpan ke `cart_items`.

### 24.7 Checkout

Frontend validasi form -> `POST /orders/checkout` -> backend validasi stok ulang -> buat `orders` dan `order_items` -> kurangi stok `products` -> kosongkan cart -> buat notifikasi admin.

### 24.8 Update order status

Admin ubah status -> `PATCH /admin/orders/{id}` -> update `orders.status` -> buat notifikasi ke user.

### 24.9 Membership

Admin aktifkan membership -> `PUT /admin/customers/{id}/membership` -> simpan `membership_active` dan `membership_rfid_uid` -> tier customer dihitung dari total belanja.

## 25. Titik Presentasi yang Bisa Ditekankan

Jika dokumen ini dipakai untuk presentasi, poin yang paling kuat untuk dijelaskan adalah:

1. Sistem sudah full-stack: frontend customer, frontend admin, backend API, dan database menyatu.
2. Customer login memakai JWT, sedangkan admin memakai validasi backend + session lokal.
3. Logika stok tidak hanya total stok, tetapi sudah sampai level size dan color per varian.
4. Checkout benar-benar mengurangi stok varian di database, bukan hanya di frontend.
5. Sistem punya notifikasi dua arah: admin diberi tahu saat order baru, user diberi tahu saat status order berubah.
6. Data customer sudah lebih kaya dari sekadar akun, karena ada alamat, preferensi, ukuran tubuh, dan membership RFID.
7. Sistem juga memiliki modul AI dan IoT, sehingga presentasi bisa menunjukkan nilai tambah di luar e-commerce biasa.

## 26. File Referensi Kode

Jika ingin menunjukkan source code saat presentasi, file paling penting adalah:

- `backend/app.py`
- `backend/models.py`
- `backend/database.py`
- `backend/product_catalog.py`
- `backend/chat_routes.py`
- `backend/iot_routes.py`
- `web/js/logic.js`
- `admin/src/modules/data.js`
- `admin/src/modules/products.js`
- `admin/src/modules/customer-service.js`
- `admin/src/script.js`

## 27. Kesimpulan

Secara teknis, Seraphine Final sudah mempunyai alur bisnis yang cukup lengkap:

- akun customer
- akun admin
- katalog produk
- stok per varian
- cart dan wishlist
- checkout dan order history
- review produk
- customer membership RFID
- notifikasi
- AI assistant
- IoT monitoring

Inti desain sistemnya adalah backend FastAPI sebagai source of truth, sedangkan frontend customer dan admin bertindak sebagai client yang memanggil endpoint sesuai kebutuhan bisnis.
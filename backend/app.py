import os
import json
import re
import shutil
from pathlib import Path
from uuid import uuid4
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc, inspect, or_, text
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import models
import database
import product_catalog
from pydantic import BaseModel

DEMO_ADMIN_ACCOUNT = {
    "id": "demo-admin",
    "name": "Admin User",
    "email": "admin@seraphine.com",
    "password": "password",
    "role": "Super Admin",
    "active": True,
    "source": "demo",
}

ROOT_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT_DIR / "assets"
IMAGE_UPLOAD_DIR = ASSETS_DIR / "img"
WEB_DIST_DIR = ROOT_DIR / "web" / "dist"
WEB_DIST_ASSETS_DIR = WEB_DIST_DIR / "web-assets"
WEB_INDEX_FILE = WEB_DIST_DIR / "index.html"
ADMIN_DIST_DIR = ROOT_DIR / "admin" / "dist"
ADMIN_INDEX_FILE = ADMIN_DIST_DIR / "index.html"
ADMIN_PUBLIC_PATH = "control-room"
IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def parse_csv_env(value: str | None):
    return [item.strip() for item in (value or '').split(',') if item.strip()]


default_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3101",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]
extra_cors_origins = parse_csv_env(os.getenv("CORS_ALLOWED_ORIGINS"))
cors_origin_regex = os.getenv(
    "CORS_ALLOWED_ORIGIN_REGEX",
    r"https?://((localhost|127\.0\.0\.1)(:\d+)?|([a-z0-9-]+\.)?(ngrok-free\.app|ngrok\.app|ngrok-free\.dev))$",
)

app = FastAPI()
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
if WEB_DIST_ASSETS_DIR.exists():
    app.mount("/web-assets", StaticFiles(directory=str(WEB_DIST_ASSETS_DIR)), name="web-assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*default_cors_origins, *extra_cors_origins],
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def support_api_prefixed_routes(request: Request, call_next):
    path = request.scope.get("path", "")
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:] or "/"
    return await call_next(request)

# Database setup
models.Base.metadata.create_all(bind=database.engine)

def ensure_size_columns():
    inspector = inspect(database.engine)
    with database.engine.begin() as connection:
        cart_columns = {column["name"] for column in inspector.get_columns("cart_items")}
        if "size" not in cart_columns:
            connection.execute(text("ALTER TABLE cart_items ADD COLUMN size VARCHAR(50) NULL"))
        if "color" not in cart_columns:
            connection.execute(text("ALTER TABLE cart_items ADD COLUMN color VARCHAR(50) NULL"))

        product_columns = {column["name"] for column in inspector.get_columns("products")}
        if "variant_stock_json" not in product_columns:
            connection.execute(text("ALTER TABLE products ADD COLUMN variant_stock_json TEXT NULL"))
            connection.execute(text("UPDATE products SET variant_stock_json = '[]' WHERE variant_stock_json IS NULL"))

        order_columns = {column["name"] for column in inspector.get_columns("order_items")}
        if "size" not in order_columns:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN size VARCHAR(50) NULL"))
        if "color" not in order_columns:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN color VARCHAR(50) NULL"))

        orders_columns = {column["name"] for column in inspector.get_columns("orders")}
        if "shipping_first_name" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_first_name VARCHAR(50) NULL"))
        if "shipping_last_name" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_last_name VARCHAR(50) NULL"))
        if "shipping_address" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_address VARCHAR(255) NULL"))
        if "payment_last4" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN payment_last4 VARCHAR(4) NULL"))

ensure_size_columns()

with database.SessionLocal() as seed_db:
    product_catalog.seed_products(seed_db)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str


class AdminLoginPayload(BaseModel):
    email: str
    password: str


class AdminAccessAccountPayload(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Customer Service"
    active: bool = True


class AdminAccessAccountUpdatePayload(BaseModel):
    name: str
    email: str
    password: str | None = None
    role: str = "Customer Service"
    active: bool = True


class VariantStockPayload(BaseModel):
    size: str | None = None
    color: str | None = None
    stock: int = 0


class ProductPayload(BaseModel):
    sku: str
    name: str
    category: str
    description: str
    price: float
    stock: int
    images: list[str]
    sizes: list[str]
    colors: list[str]
    variantStocks: list[VariantStockPayload] = []
    isFeatured: bool = False
    isNew: bool = False
    rating: float = 0
    reviews: int = 0


class ProductUpdatePayload(ProductPayload):
    id: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user(db: Session, username: str):
    return db.query(models.User).filter(
        or_(models.User.username == username, models.User.email == username)
    ).first()


def normalize_email(email: str):
    return str(email or "").strip().lower()


def serialize_admin_access_account(account: models.AdminAccessAccount):
    return {
        "id": str(account.id),
        "name": account.name,
        "email": account.email,
        "role": account.role,
        "active": account.is_active,
        "createdAt": account.created_at.isoformat() if account.created_at else None,
        "updatedAt": account.updated_at.isoformat() if account.updated_at else None,
        "source": "database",
    }


def serialize_demo_admin_account():
    return {
        "id": DEMO_ADMIN_ACCOUNT["id"],
        "name": DEMO_ADMIN_ACCOUNT["name"],
        "email": DEMO_ADMIN_ACCOUNT["email"],
        "role": DEMO_ADMIN_ACCOUNT["role"],
        "active": DEMO_ADMIN_ACCOUNT["active"],
        "createdAt": None,
        "updatedAt": None,
        "source": DEMO_ADMIN_ACCOUNT["source"],
        "isFixed": True,
        "passwordHint": DEMO_ADMIN_ACCOUNT["password"],
    }


def get_admin_access_account_by_email(db: Session, email: str):
    normalized_email = normalize_email(email)
    return db.query(models.AdminAccessAccount).filter(models.AdminAccessAccount.email == normalized_email).first()


def get_admin_access_account_by_id(db: Session, account_id: str):
    if not str(account_id).isdigit():
        return None
    return db.query(models.AdminAccessAccount).filter(models.AdminAccessAccount.id == int(account_id)).first()


def authenticate_admin_access_account(db: Session, email: str, password: str):
    normalized_email = normalize_email(email)
    plain_password = str(password or "")

    if normalized_email == DEMO_ADMIN_ACCOUNT["email"] and plain_password == DEMO_ADMIN_ACCOUNT["password"]:
        return serialize_demo_admin_account()

    account = get_admin_access_account_by_email(db, normalized_email)
    if not account or not account.is_active:
        return None
    if not verify_password(plain_password, account.hashed_password):
        return None
    return serialize_admin_access_account(account)

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def serialize_order(order: models.Order):
    customer_name = " ".join(
        part for part in [order.shipping_first_name, order.shipping_last_name] if part
    ).strip() or (order.user.username if order.user else "Unknown Customer")

    items = [
        {"product_id": item.product_id, "size": item.size, "color": item.color, "quantity": item.quantity, "price": item.price}
        for item in order.items
    ]

    return {
        "id": order.id,
        "customerId": order.user_id,
        "customerName": customer_name,
        "status": order.status,
        "total": order.total_amount,
        "total_amount": order.total_amount,
        "shipping_first_name": order.shipping_first_name,
        "shipping_last_name": order.shipping_last_name,
        "shipping_address": order.shipping_address,
        "payment_last4": order.payment_last4,
        "order_date": order.order_date.isoformat(),
        "date": order.order_date.isoformat(),
        "address": order.shipping_address,
        "items": items,
    }


def serialize_customer(user: models.User):
    orders = list(user.orders)
    total_spend = sum(order.total_amount for order in orders)
    total_orders = len(orders)
    last_order = max((order.order_date for order in orders), default=user.created_at)
    latest_shipping = next((order.shipping_address for order in sorted(orders, key=lambda item: item.order_date, reverse=True) if order.shipping_address), None)
    city = None
    if latest_shipping:
        parts = [part.strip() for part in latest_shipping.split(',') if part.strip()]
        if len(parts) >= 2:
            city = parts[-2]
        elif parts:
            city = parts[-1]

    tier = "New Client"
    if total_spend >= 5000:
        tier = "Private Client"
    elif total_spend >= 2000:
        tier = "Gold"
    elif total_spend >= 1000:
        tier = "Silver"

    return {
        "id": f"U{user.id}",
        "name": user.username,
        "email": user.email,
        "phone": "-",
        "totalOrders": total_orders,
        "totalSpend": total_spend,
        "lastActive": last_order.isoformat() if last_order else None,
        "tier": tier,
        "city": city or "-",
    }


def apply_product_payload(product: models.Product, payload: ProductUpdatePayload):
    variant_stocks = product_catalog.build_variant_stocks(
        payload.sizes,
        payload.colors,
        payload.stock,
        [variant.model_dump() for variant in payload.variantStocks],
    )
    product.sku = payload.sku
    product.name = payload.name
    product.category = payload.category
    product.description = payload.description
    product.price = payload.price
    product.stock = product_catalog.get_total_stock_from_variants(variant_stocks)
    product.images_json = json.dumps(payload.images)
    product.sizes_json = json.dumps(payload.sizes)
    product.colors_json = json.dumps(payload.colors)
    product.variant_stock_json = json.dumps(variant_stocks)
    product.is_featured = payload.isFeatured
    product.is_new = payload.isNew
    product.rating = payload.rating
    product.reviews = payload.reviews


def sanitize_filename(filename: str):
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(filename).stem).strip("-") or "product"
    extension = Path(filename).suffix.lower()
    return stem, extension


def should_serve_storefront(path: str):
    protected_prefixes = (
        "auth",
        "admin",
        ADMIN_PUBLIC_PATH,
        "products",
        "cart",
        "wishlist",
        "orders",
        "assets",
        "web-assets",
        "docs",
        "redoc",
        "openapi.json",
    )
    return not any(path == prefix or path.startswith(f"{prefix}/") for prefix in protected_prefixes)

# Routes
@app.get("/", include_in_schema=False)
def serve_storefront_root():
    if WEB_INDEX_FILE.exists():
        return FileResponse(str(WEB_INDEX_FILE))
    raise HTTPException(status_code=404, detail="Storefront build not found")


@app.get(f"/{ADMIN_PUBLIC_PATH}", include_in_schema=False)
def serve_admin_root():
    if ADMIN_INDEX_FILE.exists():
        return FileResponse(str(ADMIN_INDEX_FILE))
    raise HTTPException(status_code=404, detail="Admin build not found")


@app.get(f"/{ADMIN_PUBLIC_PATH}/{{full_path:path}}", include_in_schema=False)
def serve_admin_app(full_path: str):
    normalized_path = (full_path or "").strip("/")
    if not normalized_path:
        return serve_admin_root()

    target_file = ADMIN_DIST_DIR / normalized_path
    if target_file.exists() and target_file.is_file():
        return FileResponse(str(target_file))

    if ADMIN_INDEX_FILE.exists():
        return FileResponse(str(ADMIN_INDEX_FILE))

    raise HTTPException(status_code=404, detail="Admin build not found")


@app.get("/products")
def get_products(db: Session = Depends(database.get_db)):
    return [product_catalog.serialize_product(product) for product in product_catalog.list_products(db)]


@app.get("/products/{product_id}")
def get_product(product_id: str, db: Session = Depends(database.get_db)):
    product = product_catalog.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_catalog.serialize_product(product)


@app.post("/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = get_user(db, user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/admin/auth/login")
def admin_login(payload: AdminLoginPayload, db: Session = Depends(database.get_db)):
    account = authenticate_admin_access_account(db, payload.email, payload.password)
    if not account:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return account


@app.get("/admin/access-accounts")
def admin_get_access_accounts(db: Session = Depends(database.get_db)):
    accounts = db.query(models.AdminAccessAccount).order_by(desc(models.AdminAccessAccount.created_at)).all()
    return [serialize_demo_admin_account(), *[serialize_admin_access_account(account) for account in accounts]]


@app.post("/admin/access-accounts")
def admin_create_access_account(payload: AdminAccessAccountPayload, db: Session = Depends(database.get_db)):
    normalized_email = normalize_email(payload.email)
    normalized_name = payload.name.strip()
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email wajib diisi")
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Nama akun wajib diisi")
    if normalized_email == DEMO_ADMIN_ACCOUNT["email"]:
        raise HTTPException(status_code=400, detail="Email demo bawaan sudah dipakai sistem")
    if get_admin_access_account_by_email(db, normalized_email):
        raise HTTPException(status_code=400, detail="Email akun sudah terdaftar")
    if len(payload.password or "") < 4:
        raise HTTPException(status_code=400, detail="Password minimal 4 karakter")

    account = models.AdminAccessAccount(
        name=normalized_name,
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role.strip() or "Customer Service",
        is_active=payload.active,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return serialize_admin_access_account(account)


@app.put("/admin/access-accounts/{account_id}")
def admin_update_access_account(account_id: str, payload: AdminAccessAccountUpdatePayload, db: Session = Depends(database.get_db)):
    account = get_admin_access_account_by_id(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")

    normalized_email = normalize_email(payload.email)
    normalized_name = payload.name.strip()
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email wajib diisi")
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Nama akun wajib diisi")
    if normalized_email == DEMO_ADMIN_ACCOUNT["email"]:
        raise HTTPException(status_code=400, detail="Email demo bawaan tidak bisa dipakai ulang")

    existing_account = get_admin_access_account_by_email(db, normalized_email)
    if existing_account and existing_account.id != account.id:
        raise HTTPException(status_code=400, detail="Email akun sudah terdaftar")

    account.name = normalized_name
    account.email = normalized_email
    account.role = payload.role.strip() or "Customer Service"
    account.is_active = payload.active

    next_password = str(payload.password or "").strip()
    if next_password:
        if len(next_password) < 4:
            raise HTTPException(status_code=400, detail="Password minimal 4 karakter")
        account.hashed_password = get_password_hash(next_password)

    db.commit()
    db.refresh(account)
    return serialize_admin_access_account(account)


@app.delete("/admin/access-accounts/{account_id}")
def admin_delete_access_account(account_id: str, db: Session = Depends(database.get_db)):
    account = get_admin_access_account_by_id(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    db.delete(account)
    db.commit()
    return {"message": "Access account deleted"}


# --- Helper: Get Current User from Token ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = get_user(db, username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --- Pydantic Schemas ---
class CartItemAdd(BaseModel):
    product_id: str
    size: str
    color: str | None = None
    quantity: int = 1

class CartItemResponse(BaseModel):
    id: int
    product_id: str
    size: str | None = None
    color: str | None = None
    quantity: int
    
    class Config:
        from_attributes = True

class WishlistItemAdd(BaseModel):
    product_id: str

class WishlistItemResponse(BaseModel):
    id: int
    product_id: str
    
    class Config:
        from_attributes = True

class OrderItemRequest(BaseModel):
    product_id: str
    size: str
    color: str | None = None
    quantity: int

class OrderCheckout(BaseModel):
    first_name: str
    last_name: str
    address: str
    payment_last4: str
    items: list[OrderItemRequest]
    total_amount: float | None = None


class StockAdjustment(BaseModel):
    product_id: str
    size: str | None = None
    color: str | None = None
    requested_quantity: int
    applied_quantity: int
    available_quantity: int

class OrderResponse(BaseModel):
    id: int
    status: str
    total_amount: float
    
    class Config:
        from_attributes = True


def clamp_quantity_to_stock(product: models.Product, size: str | None, color: str | None, requested_quantity: int):
    available_quantity = product_catalog.get_variant_stock(product, size, color)
    requested_quantity = max(int(requested_quantity or 0), 0)
    applied_quantity = min(requested_quantity, max(available_quantity, 0))
    adjustment = None

    if applied_quantity != requested_quantity:
        adjustment = StockAdjustment(
            product_id=str(product.id),
            size=size,
            color=color,
            requested_quantity=requested_quantity,
            applied_quantity=applied_quantity,
            available_quantity=max(available_quantity, 0),
        )

    return applied_quantity, max(available_quantity, 0), adjustment


# --- CART ENDPOINTS ---
@app.post("/cart/add")
def add_to_cart(item: CartItemAdd, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    product = product_catalog.get_product(db, item.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not product_catalog.is_valid_size(db, item.product_id, item.size):
        raise HTTPException(status_code=400, detail="Invalid size for selected product")

    if not product_catalog.is_valid_color(db, item.product_id, item.color):
        raise HTTPException(status_code=400, detail="Invalid color for selected product")

    # Check if item already in cart
    existing = db.query(models.CartItem).filter(
        models.CartItem.user_id == current_user.id,
        models.CartItem.product_id == item.product_id,
        models.CartItem.size == item.size,
        models.CartItem.color == item.color,
    ).first()

    current_quantity = existing.quantity if existing else 0
    available_quantity = product_catalog.get_variant_stock(product, item.size, item.color)
    target_quantity = min(current_quantity + max(item.quantity, 0), max(available_quantity, 0))
    added_quantity = max(target_quantity - current_quantity, 0)

    if available_quantity <= 0:
        raise HTTPException(status_code=400, detail="Variant stok habis")

    if added_quantity <= 0:
        return {
            "message": f"Stok tersisa {available_quantity}. Quantity di bag tidak bertambah.",
            "adjusted": True,
            "available_quantity": available_quantity,
            "cart_quantity": current_quantity,
            "added_quantity": 0,
        }
    
    if existing:
        existing.quantity = target_quantity
    else:
        cart_item = models.CartItem(
            user_id=current_user.id,
            product_id=item.product_id,
            size=item.size,
            color=item.color,
            quantity=added_quantity
        )
        db.add(cart_item)
    
    db.commit()
    return {
        "message": "Item added to cart",
        "adjusted": added_quantity != item.quantity,
        "available_quantity": available_quantity,
        "cart_quantity": target_quantity,
        "added_quantity": added_quantity,
    }

@app.get("/cart")
def get_cart(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    items = db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()
    return [{"id": item.id, "product_id": item.product_id, "size": item.size, "color": item.color, "quantity": item.quantity} for item in items]

@app.delete("/cart/{item_id}")
def remove_from_cart(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    item = db.query(models.CartItem).filter(
        models.CartItem.id == item_id,
        models.CartItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item removed from cart"}

@app.post("/cart/clear")
def clear_cart(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Cart cleared"}


# --- WISHLIST ENDPOINTS ---
@app.post("/wishlist/add")
def add_to_wishlist(item: WishlistItemAdd, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    # Check if already in wishlist
    existing = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == current_user.id,
        models.WishlistItem.product_id == item.product_id
    ).first()
    
    if existing:
        return {"message": "Item already in wishlist"}
    
    wishlist_item = models.WishlistItem(
        user_id=current_user.id,
        product_id=item.product_id
    )
    db.add(wishlist_item)
    db.commit()
    return {"message": "Item added to wishlist"}

@app.get("/wishlist")
def get_wishlist(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    items = db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).all()
    return [{"id": item.id, "product_id": item.product_id} for item in items]

@app.delete("/wishlist/{item_id}")
def remove_from_wishlist(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    item = db.query(models.WishlistItem).filter(
        models.WishlistItem.id == item_id,
        models.WishlistItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item removed from wishlist"}


# --- ORDER ENDPOINTS ---
@app.post("/orders/checkout")
def checkout(order_data: OrderCheckout, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    computed_total = 0
    normalized_items = []
    adjustments = []

    for item in order_data.items:
        product = product_catalog.get_product(db, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        if not product_catalog.is_valid_size(db, item.product_id, item.size):
            raise HTTPException(status_code=400, detail=f"Invalid size for product {item.product_id}")

        if not product_catalog.is_valid_color(db, item.product_id, item.color):
            raise HTTPException(status_code=400, detail=f"Invalid color for product {item.product_id}")

        if item.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")

        applied_quantity, available_quantity, adjustment = clamp_quantity_to_stock(
            product,
            item.size,
            item.color,
            item.quantity,
        )

        if available_quantity <= 0 or applied_quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Stock untuk product {item.product_id} sudah habis")

        if adjustment:
            adjustments.append(adjustment.model_dump())

        unit_price = product_catalog.get_product_price(db, item.product_id)
        computed_total += applied_quantity * unit_price
        normalized_items.append({
            "product": product,
            "product_id": item.product_id,
            "size": item.size,
            "color": item.color,
            "quantity": applied_quantity,
            "price": unit_price,
        })

    # Create order
    order = models.Order(
        user_id=current_user.id,
        shipping_first_name=order_data.first_name.strip(),
        shipping_last_name=order_data.last_name.strip(),
        shipping_address=order_data.address.strip(),
        payment_last4=order_data.payment_last4.strip(),
        total_amount=computed_total,
        status="pending"
    )
    db.add(order)
    db.flush()  # Get order ID without committing
    
    # Add order items
    for item in normalized_items:
        order_item = models.OrderItem(
            order_id=order.id,
            product_id=item["product_id"],
            size=item["size"],
            color=item["color"],
            quantity=item["quantity"],
            price=item["price"]
        )
        db.add(order_item)
        product_catalog.update_variant_stock(item["product"], item["size"], item["color"], -item["quantity"])
    
    # Clear cart 
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    
    db.commit()
    db.refresh(order)
    return {
        "message": "Order placed successfully",
        "order_id": order.id,
        "status": order.status,
        "adjustments": adjustments,
    }

@app.get("/orders")
def get_orders(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()
    return [serialize_order(order) for order in orders]

@app.get("/orders/{order_id}")
def get_order(order_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return serialize_order(order)


@app.get("/admin/products")
def admin_get_products(db: Session = Depends(database.get_db)):
    return [product_catalog.serialize_product(product) for product in product_catalog.list_products(db)]


@app.post("/admin/uploads/images")
async def admin_upload_product_image(request: Request, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No image file provided")

    stem, extension = sanitize_filename(file.filename)
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPG, PNG, WEBP, or GIF.")

    filename = f"{stem}-{uuid4().hex[:10]}{extension}"
    destination = IMAGE_UPLOAD_DIR / filename

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    public_url = f"{str(request.base_url).rstrip('/')}/assets/img/{filename}"
    return {
        "filename": filename,
        "path": f"/assets/img/{filename}",
        "url": public_url,
    }


@app.post("/admin/products")
def admin_create_product(payload: ProductPayload, db: Session = Depends(database.get_db)):
    existing_ids = [int(product.id) for product in product_catalog.list_products(db) if str(product.id).isdigit()]
    next_id = str(max(existing_ids, default=0) + 1)
    product = models.Product(id=next_id)
    apply_product_payload(product, ProductUpdatePayload(id=next_id, **payload.model_dump()))
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_catalog.serialize_product(product)


@app.put("/admin/products/{product_id}")
def admin_update_product(product_id: str, payload: ProductUpdatePayload, db: Session = Depends(database.get_db)):
    product = product_catalog.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    apply_product_payload(product, payload)
    db.commit()
    db.refresh(product)
    return product_catalog.serialize_product(product)


@app.delete("/admin/products/{product_id}")
def admin_delete_product(product_id: str, db: Session = Depends(database.get_db)):
    product = product_catalog.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}


@app.get("/admin/orders")
def admin_get_orders(db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).order_by(desc(models.Order.order_date)).all()
    return [serialize_order(order) for order in orders]


@app.patch("/admin/orders/{order_id}")
def admin_update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(database.get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = payload.status.lower()
    db.commit()
    db.refresh(order)
    return serialize_order(order)


@app.get("/admin/customers")
def admin_get_customers(db: Session = Depends(database.get_db)):
    users = db.query(models.User).order_by(desc(models.User.created_at)).all()
    return [serialize_customer(user) for user in users]


@app.get("/{full_path:path}", include_in_schema=False)
def serve_storefront_app(full_path: str):
    normalized_path = (full_path or "").strip("/")
    if not normalized_path:
        return serve_storefront_root()

    target_file = WEB_DIST_DIR / normalized_path
    if target_file.exists() and target_file.is_file():
        return FileResponse(str(target_file))

    if not should_serve_storefront(normalized_path):
        raise HTTPException(status_code=404, detail="Not Found")

    if WEB_INDEX_FILE.exists():
        return FileResponse(str(WEB_INDEX_FILE))

    raise HTTPException(status_code=404, detail="Storefront build not found")

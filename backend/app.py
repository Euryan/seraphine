import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import inspect, or_, text
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import models
import database
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
models.Base.metadata.create_all(bind=database.engine)

def ensure_size_columns():
    inspector = inspect(database.engine)
    with database.engine.begin() as connection:
        cart_columns = {column["name"] for column in inspector.get_columns("cart_items")}
        if "size" not in cart_columns:
            connection.execute(text("ALTER TABLE cart_items ADD COLUMN size VARCHAR(50) NULL"))

        order_columns = {column["name"] for column in inspector.get_columns("order_items")}
        if "size" not in order_columns:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN size VARCHAR(50) NULL"))

ensure_size_columns()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

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

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# Routes
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
    quantity: int = 1

class CartItemResponse(BaseModel):
    id: int
    product_id: str
    size: str | None = None
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
    quantity: int
    price: float

class OrderCheckout(BaseModel):
    items: list[OrderItemRequest]
    total_amount: float

class OrderResponse(BaseModel):
    id: int
    status: str
    total_amount: float
    
    class Config:
        from_attributes = True


# --- CART ENDPOINTS ---
@app.post("/cart/add")
def add_to_cart(item: CartItemAdd, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    # Check if item already in cart
    existing = db.query(models.CartItem).filter(
        models.CartItem.user_id == current_user.id,
        models.CartItem.product_id == item.product_id,
        models.CartItem.size == item.size
    ).first()
    
    if existing:
        existing.quantity += item.quantity
    else:
        cart_item = models.CartItem(
            user_id=current_user.id,
            product_id=item.product_id,
            size=item.size,
            quantity=item.quantity
        )
        db.add(cart_item)
    
    db.commit()
    return {"message": "Item added to cart"}

@app.get("/cart")
def get_cart(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    items = db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()
    return [{"id": item.id, "product_id": item.product_id, "size": item.size, "quantity": item.quantity} for item in items]

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
    # Create order
    order = models.Order(
        user_id=current_user.id,
        total_amount=order_data.total_amount,
        status="pending"
    )
    db.add(order)
    db.flush()  # Get order ID without committing
    
    # Add order items
    for item in order_data.items:
        order_item = models.OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            size=item.size,
            quantity=item.quantity,
            price=item.price
        )
        db.add(order_item)
    
    # Clear cart 
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    
    db.commit()
    db.refresh(order)
    return {"message": "Order placed successfully", "order_id": order.id, "status": order.status}

@app.get("/orders")
def get_orders(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()
    result = []
    for order in orders:
        items = [
            {"product_id": item.product_id, "size": item.size, "quantity": item.quantity, "price": item.price}
            for item in order.items
        ]
        result.append({
            "id": order.id,
            "status": order.status,
            "total_amount": order.total_amount,
            "order_date": order.order_date.isoformat(),
            "items": items
        })
    return result

@app.get("/orders/{order_id}")
def get_order(order_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    items = [
        {"product_id": item.product_id, "size": item.size, "quantity": item.quantity, "price": item.price}
        for item in order.items
    ]
    return {
        "id": order.id,
        "status": order.status,
        "total_amount": order.total_amount,
        "order_date": order.order_date.isoformat(),
        "items": items
    }

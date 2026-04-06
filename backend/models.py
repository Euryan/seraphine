from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Product(Base):
    __tablename__ = "products"

    id = Column(String(50), primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    images_json = Column(Text, nullable=False)
    sizes_json = Column(Text, nullable=False)
    colors_json = Column(Text, nullable=False)
    variant_stock_json = Column(Text, nullable=False, default='[]')
    is_featured = Column(Boolean, default=False)
    is_new = Column(Boolean, default=False)
    rating = Column(Float, default=0)
    reviews = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(128))
    profile_json = Column(Text, nullable=True)
    address_json = Column(Text, nullable=True)
    measurements_json = Column(Text, nullable=True)
    preferences_json = Column(Text, nullable=True)
    membership_active = Column(Boolean, default=False)
    membership_rfid_uid = Column(String(64), nullable=True, index=True)
    membership_joined_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")


class AdminAccessAccount(Base):
    __tablename__ = "admin_access_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    role = Column(String(50), default="Customer Service")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    product_id = Column(String(50))
    size = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="cart_items")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    product_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="wishlist_items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    shipping_first_name = Column(String(50), nullable=True)
    shipping_last_name = Column(String(50), nullable=True)
    shipping_email = Column(String(100), nullable=True)
    shipping_phone = Column(String(50), nullable=True)
    shipping_address = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_province = Column(String(100), nullable=True)
    shipping_postal_code = Column(String(20), nullable=True)
    shipping_service = Column(String(50), nullable=True)
    shipping_fee = Column(Float, default=0)
    delivery_notes = Column(Text, nullable=True)
    payment_method = Column(String(50), nullable=True)
    payment_last4 = Column(String(4), nullable=True)
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="pending")
    total_amount = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    product_id = Column(String(50))
    size = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    quantity = Column(Integer)
    price = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")


class ProductReview(Base):
    __tablename__ = "product_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    order_id = Column(Integer, index=True, nullable=False)
    order_item_id = Column(Integer, unique=True, index=True, nullable=False)
    product_id = Column(String(50), index=True, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    audience = Column(String(20), nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    order_id = Column(Integer, nullable=True, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(140), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime, nullable=True)


import json

import models


DEFAULT_PRODUCTS = [
    {
        "id": "1",
        "sku": "SRF-001",
        "name": "Silk Evening Gown",
        "price": 2450,
        "category": "Apparel",
        "description": "A breathtaking floor-length gown crafted from the finest Italian silk. Features a delicate cowl neckline and an elegant open back.",
        "images": [
            "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&q=80&w=800"
        ],
        "sizes": ["XS", "S", "M", "L"],
        "colors": ["Midnight Black", "Champagne", "Emerald"],
        "stock": 3,
        "rating": 4.9,
        "reviews": 12,
        "is_featured": True,
        "is_new": True,
    },
    {
        "id": "2",
        "sku": "SRF-002",
        "name": "Leather Monogram Tote",
        "price": 1850,
        "category": "Bags",
        "description": "Signature monogrammed leather tote with gold-tone hardware. Spacious interior with multiple compartments for the modern professional.",
        "images": [
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800"
        ],
        "sizes": ["One Size"],
        "colors": ["Cognac", "Onyx"],
        "stock": 5,
        "rating": 4.8,
        "reviews": 24,
        "is_featured": True,
        "is_new": True,
    },
    {
        "id": "3",
        "sku": "SRF-003",
        "name": "Velvet Smoking Jacket",
        "price": 1200,
        "category": "Apparel",
        "description": "A classic tailored smoking jacket in rich burgundy velvet. Satin lapels and silk lining provide ultimate comfort and style.",
        "images": [
            "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800"
        ],
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Burgundy", "Navy"],
        "stock": 2,
        "rating": 5.0,
        "reviews": 8,
        "is_featured": False,
        "is_new": True,
    },
    {
        "id": "4",
        "sku": "SRF-004",
        "name": "Gold Link Bracelet",
        "price": 3200,
        "category": "Accessories",
        "description": "18k solid gold link bracelet. A timeless piece that exudes sophistication and grace.",
        "images": [
            "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1611085583191-a3b13b24424a?auto=format&fit=crop&q=80&w=800"
        ],
        "sizes": ["S", "M"],
        "colors": ["Gold"],
        "stock": 1,
        "rating": 4.9,
        "reviews": 15,
        "is_featured": True,
        "is_new": False,
    },
    {
        "id": "5",
        "sku": "SRF-005",
        "name": "Suede Chelsea Boots",
        "price": 850,
        "category": "Footwear",
        "description": "Handcrafted Italian suede boots with a sleek silhouette. Elastic side panels and pull tabs for easy wear.",
        "images": [
            "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800"
        ],
        "sizes": ["40", "41", "42", "43", "44"],
        "colors": ["Sand", "Chocolate"],
        "stock": 8,
        "rating": 4.7,
        "reviews": 32,
        "is_featured": False,
        "is_new": False,
    },
    {
        "id": "6",
        "sku": "SRF-006",
        "name": "Cashmere Oversized Coat",
        "price": 3800,
        "category": "Apparel",
        "description": "Luxurious double-faced cashmere coat. Minimalist design with a relaxed fit and waist-defining belt.",
        "images": [
            "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&q=80&w=800"
        ],
        "sizes": ["S", "M", "L"],
        "colors": ["Camel", "Ivory"],
        "stock": 4,
        "rating": 4.9,
        "reviews": 18,
        "is_featured": True,
        "is_new": False,
    },
    {
        "id": "7",
        "sku": "SRF-007",
        "name": "Crystal Satin Heels",
        "price": 1450,
        "category": "Footwear",
        "description": "Elegant satin heels finished with crystal embellishment, crafted to elevate formal evening looks.",
        "images": [
            "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=800"
        ],
        "sizes": ["36", "37", "38", "39", "40"],
        "colors": ["Black", "Silver"],
        "stock": 6,
        "rating": 4.8,
        "reviews": 11,
        "is_featured": True,
        "is_new": False,
    },
]


def _variant_key(size=None, color=None):
    return f"{size or ''}::{color or ''}"


def build_variant_stocks(sizes, colors, total_stock, existing_variant_stocks=None):
    normalized_sizes = sizes or [None]
    normalized_colors = colors or [None]
    combinations = [
        {"size": size, "color": color, "stock": 0}
        for size in normalized_sizes
        for color in normalized_colors
    ]

    if not combinations:
        combinations = [{"size": None, "color": None, "stock": 0}]

    existing_map = {}
    for variant in existing_variant_stocks or []:
        existing_map[_variant_key(variant.get("size"), variant.get("color"))] = max(int(variant.get("stock", 0)), 0)

    if existing_map:
        for variant in combinations:
            variant["stock"] = existing_map.get(_variant_key(variant["size"], variant["color"]), 0)
        return combinations

    total_stock = max(int(total_stock or 0), 0)
    for index in range(total_stock):
        combinations[index % len(combinations)]["stock"] += 1
    return combinations


def get_variant_stocks(product: models.Product):
    sizes = json.loads(product.sizes_json)
    colors = json.loads(product.colors_json)
    raw_variant_stocks = json.loads(product.variant_stock_json) if getattr(product, "variant_stock_json", None) else []
    return build_variant_stocks(sizes, colors, product.stock, raw_variant_stocks)


def get_total_stock_from_variants(variant_stocks):
    return sum(max(int(variant.get("stock", 0)), 0) for variant in variant_stocks)


def get_variant_stock(product: models.Product, size=None, color=None):
    variant_stocks = get_variant_stocks(product)
    for variant in variant_stocks:
        if variant.get("size") == size and variant.get("color") == color:
            return max(int(variant.get("stock", 0)), 0)
    return 0


def update_variant_stock(product: models.Product, size=None, color=None, quantity=0):
    variant_stocks = get_variant_stocks(product)
    for variant in variant_stocks:
        if variant.get("size") == size and variant.get("color") == color:
            next_stock = max(int(variant.get("stock", 0)) + int(quantity), 0)
            variant["stock"] = next_stock
            product.variant_stock_json = json.dumps(variant_stocks)
            product.stock = get_total_stock_from_variants(variant_stocks)
            return next_stock
    raise ValueError("Variant not found")


def is_valid_color(db, product_id: str, color: str | None):
    product = get_product(db, product_id)
    if not product:
        return False

    colors = json.loads(product.colors_json)
    if not colors:
        return color in (None, "")
    if len(colors) == 1 and color in (None, "", colors[0]):
        return True
    return color in colors


def serialize_product(product: models.Product):
    images = json.loads(product.images_json)
    sizes = json.loads(product.sizes_json)
    colors = json.loads(product.colors_json)
    variant_stocks = get_variant_stocks(product)
    return {
        "id": product.id,
        "sku": product.sku,
        "name": product.name,
        "price": product.price,
        "category": product.category,
        "description": product.description,
        "images": images,
        "image": images[0] if images else None,
        "sizes": sizes,
        "colors": colors,
        "stock": get_total_stock_from_variants(variant_stocks),
        "variantStocks": variant_stocks,
        "rating": product.rating,
        "reviews": product.reviews,
        "isFeatured": product.is_featured,
        "isNew": product.is_new,
        "createdAt": product.created_at.isoformat() if product.created_at else None,
        "updatedAt": product.updated_at.isoformat() if product.updated_at else None,
    }


def create_product_model(payload: dict):
    variant_stocks = build_variant_stocks(
        payload.get("sizes", []),
        payload.get("colors", []),
        payload.get("stock", 0),
        payload.get("variant_stocks") or payload.get("variantStocks") or [],
    )
    return models.Product(
        id=str(payload["id"]),
        sku=payload["sku"],
        name=payload["name"],
        category=payload["category"],
        description=payload["description"],
        price=payload["price"],
        stock=get_total_stock_from_variants(variant_stocks),
        images_json=json.dumps(payload["images"]),
        sizes_json=json.dumps(payload["sizes"]),
        colors_json=json.dumps(payload["colors"]),
        variant_stock_json=json.dumps(variant_stocks),
        is_featured=payload.get("is_featured", False),
        is_new=payload.get("is_new", False),
        rating=payload.get("rating", 0),
        reviews=payload.get("reviews", 0),
    )


def seed_products(db):
    if db.query(models.Product).count() > 0:
        return

    for payload in DEFAULT_PRODUCTS:
        db.add(create_product_model(payload))

    db.commit()


def list_products(db):
    return db.query(models.Product).order_by(models.Product.id.asc()).all()


def get_product(db, product_id: str):
    return db.query(models.Product).filter(models.Product.id == str(product_id)).first()


def get_product_price(db, product_id: str):
    product = get_product(db, product_id)
    return product.price if product else None


def is_valid_size(db, product_id: str, size: str):
    product = get_product(db, product_id)
    if not product:
        return False
    return size in json.loads(product.sizes_json)
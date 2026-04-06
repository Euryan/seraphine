"""
AI Service Module — Google Gemini integration for chat and size recommendation.
"""

import json
import os
import httpx
from typing import AsyncIterator

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "gemini-2.5-flash"

SERAPHINE_SYSTEM_PROMPT = """You are Seraphine AI, the virtual stylist and customer assistant for Seraphine Couture — an Italian luxury fashion house founded in 1924. You embody elegance, warmth, and deep fashion expertise.

Personality:
- Warm yet sophisticated tone, like a personal stylist at a luxury boutique
- Use concise answers (2-4 sentences unless detail is requested)
- You may use light fashion terminology but keep it accessible
- Never make up product information — only reference products from the catalog provided

Brand Info:
- Seraphine Couture, Via Montenapoleone 18, Milan, Italy
- Known for silk, velvet, cashmere, and fine leather goods
- Categories: Apparel, Bags, Footwear, Accessories

Shipping & Returns:
- Complimentary shipping on orders over $500
- Standard delivery: 5-7 business days
- Express delivery: 2-3 business days ($35)
- 30-day return policy for unworn items with tags
- Free returns for exchanges

Product Care:
- Silk: Dry clean only, store hanging
- Leather: Wipe with damp cloth, condition quarterly
- Velvet: Steam to remove wrinkles, brush gently
- Cashmere: Hand wash cold, lay flat to dry
- Gold jewelry: Polish with soft cloth, store in pouch"""

SIZE_RECOMMENDATION_PROMPT = """You are a professional fashion sizing expert for Seraphine Couture. Based on the customer's body measurements and the product details, recommend the best size.

Rules:
- Only recommend sizes that exist for this product
- Give ONE clear recommendation with a confidence level (high/medium/low)
- Explain your reasoning briefly (1-2 sentences)
- If measurements are unusual or between sizes, suggest the larger size for comfort
- Consider the product category: Apparel fits differently from Accessories

General sizing guide for Seraphine Couture:
- XS: Chest 78-82cm, Waist 60-64cm, Hip 86-90cm
- S: Chest 83-87cm, Waist 65-69cm, Hip 91-95cm
- M: Chest 88-92cm, Waist 70-74cm, Hip 96-100cm
- L: Chest 93-97cm, Waist 75-79cm, Hip 101-105cm
- XL: Chest 98-102cm, Waist 80-84cm, Hip 106-110cm

For bags and some accessories, "One Size" is typical.

Respond in this exact JSON format only:
{"recommended_size": "M", "confidence": "high", "explanation": "Your chest measurement of 90cm falls squarely in the M range...", "fit_notes": "This silk gown has a relaxed fit, so M will drape beautifully."}"""


def get_gemini_api_key() -> str:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Add it to backend/.env or your environment variables."
        )
    return api_key


def build_product_catalog_context(products: list[dict]) -> str:
    if not products:
        return "No products currently available."
    lines = ["Current Seraphine Couture catalog:"]
    ranked_products = sorted(products, key=lambda product: (product.get("soldCount", 0), product.get("reviews", 0), product.get("rating", 0)), reverse=True)
    top_sellers = [product for product in ranked_products if product.get("soldCount", 0) > 0][:5]
    if top_sellers:
        lines.append("Top sellers by completed orders:")
        for product in top_sellers:
            lines.append(
                f"- {product['name']}: sold {product.get('soldCount', 0)} units | Rating {product.get('rating', 0):.1f}/5 from {product.get('reviews', 0)} reviews"
            )
    for p in ranked_products[:20]:
        sizes = ", ".join(p.get("sizes", []))
        colors = ", ".join(p.get("colors", []))
        stock = p.get("stock", 0)
        sold_count = p.get("soldCount", 0)
        rating = p.get("rating", 0)
        reviews = p.get("reviews", 0)
        lines.append(
            f"- {p['name']} (${p['price']:,.0f}) | Category: {p.get('category','')} | "
            f"Sizes: {sizes} | Colors: {colors} | Stock: {stock} | Sold: {sold_count} | Rating: {rating:.1f}/5 ({reviews} reviews)"
        )
    return "\n".join(lines)


def build_user_context(user_data: dict | None) -> str:
    if not user_data:
        return ""
    parts = []
    if user_data.get("username"):
        parts.append(f"Customer: {user_data['username']}")
    if user_data.get("cart"):
        cart_items = [f"  - {i.get('name', i.get('product_id','?'))} (Size: {i.get('size','?')}, Color: {i.get('color','?')}, Qty: {i.get('quantity',1)})" for i in user_data["cart"]]
        parts.append("Current cart:\n" + "\n".join(cart_items))
    if user_data.get("orders"):
        recent = user_data["orders"][:3]
        order_lines = [f"  - Order #{o.get('id','')} ({o.get('status','')}) — ${o.get('total_amount',0):,.0f}" for o in recent]
        parts.append("Recent orders:\n" + "\n".join(order_lines))
    return "\n".join(parts) if parts else ""


def build_page_context(page_context: dict | None) -> str:
    if not page_context:
        return ""
    page = page_context.get("page", "")
    if page == "product" and page_context.get("product"):
        p = page_context["product"]
        sizes = ", ".join(p.get("sizes", []))
        colors = ", ".join(p.get("colors", []))
        return (
            f"Customer is currently viewing: {p.get('name', '')} (${p.get('price', 0):,.0f})\n"
            f"Category: {p.get('category', '')} | Sizes: {sizes} | Colors: {colors}\n"
            f"Description: {p.get('description', '')}"
        )
    if page == "cart":
        return "Customer is currently on the shopping cart page."
    if page == "checkout":
        return "Customer is on the checkout page."
    return ""


def _build_gemini_contents(conversation_history: list[dict], message: str) -> list[dict]:
    """Convert chat history to Gemini contents format."""
    contents = []
    for msg in conversation_history[-10:]:
        role = "model" if msg.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


async def stream_chat_response(
    message: str,
    conversation_history: list[dict],
    products: list[dict],
    user_data: dict | None = None,
    page_context: dict | None = None,
    model: str = DEFAULT_MODEL,
) -> AsyncIterator[str]:
    """Stream chat response from Google Gemini."""
    system_parts = [SERAPHINE_SYSTEM_PROMPT]
    catalog = build_product_catalog_context(products)
    if catalog:
        system_parts.append(catalog)
    user_ctx = build_user_context(user_data)
    if user_ctx:
        system_parts.append(f"Customer context:\n{user_ctx}")
    page_ctx = build_page_context(page_context)
    if page_ctx:
        system_parts.append(f"Page context:\n{page_ctx}")

    system_instruction = "\n\n".join(system_parts)
    contents = _build_gemini_contents(conversation_history, message)

    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024},
    }

    api_key = get_gemini_api_key()
    url = f"{GEMINI_BASE}/models/{model}:streamGenerateContent?alt=sse&key={api_key}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                try:
                    data = json.loads(line[6:])
                    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    for part in parts:
                        text = part.get("text", "")
                        if text:
                            yield text
                except (json.JSONDecodeError, IndexError, KeyError):
                    continue


async def get_size_recommendation(
    product: dict,
    measurements: dict,
    purchase_history: list[dict] | None = None,
    model: str = DEFAULT_MODEL,
) -> dict:
    """Get AI size recommendation for a product."""
    sizes = ", ".join(product.get("sizes", []))
    colors = ", ".join(product.get("colors", []))

    user_prompt_parts = [
        f"Product: {product.get('name', '')}",
        f"Category: {product.get('category', '')}",
        f"Available sizes: {sizes}",
        f"Description: {product.get('description', '')}",
        "",
        "Customer measurements:",
        f"  Height: {measurements.get('height_cm', 'N/A')} cm",
        f"  Weight: {measurements.get('weight_kg', 'N/A')} kg",
        f"  Chest: {measurements.get('chest_cm', 'N/A')} cm",
        f"  Waist: {measurements.get('waist_cm', 'N/A')} cm",
        f"  Hip: {measurements.get('hip_cm', 'N/A')} cm",
    ]

    if measurements.get("preferences"):
        user_prompt_parts.append(f"  Fit preference: {measurements['preferences']}")

    if purchase_history:
        user_prompt_parts.append("\nPrevious purchases:")
        for order in purchase_history[:5]:
            for item in order.get("items", []):
                user_prompt_parts.append(
                    f"  - {item.get('name', item.get('product_id', '?'))} size {item.get('size', '?')}"
                )

    user_prompt = "\n".join(user_prompt_parts)

    payload = {
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": SIZE_RECOMMENDATION_PROMPT}]},
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }

    api_key = get_gemini_api_key()
    url = f"{GEMINI_BASE}/models/{model}:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

    raw = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "{}")
    )
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "recommended_size": product.get("sizes", ["M"])[0],
            "confidence": "low",
            "explanation": "Unable to parse AI response. Defaulting to first available size.",
            "fit_notes": raw[:200] if raw else "",
        }

    available = product.get("sizes", [])
    if result.get("recommended_size") not in available and available:
        result["recommended_size"] = available[0]
        result["confidence"] = "low"
        result["explanation"] += " (Adjusted to available size.)"

    return result


async def check_gemini_health() -> dict:
    """Check if Gemini API key is valid and model is available."""
    try:
        api_key = get_gemini_api_key()
        url = f"{GEMINI_BASE}/models?key={api_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            return {"online": True, "provider": "gemini", "model": DEFAULT_MODEL, "models_available": len(models)}
    except Exception as e:
        return {"online": False, "provider": "gemini", "error": str(e)}


def get_chat_suggestions(page: str, product: dict | None = None) -> list[str]:
    """Return context-aware chat suggestions."""
    base = [
        "What are your shipping options?",
        "Tell me about your return policy",
    ]
    if page == "product" and product:
        return [
            f"Is the {product.get('name', 'this item')} true to size?",
            "What size would you recommend for me?",
            f"What colors are available for this?",
            "How should I care for this item?",
        ]
    if page == "cart":
        return [
            "Can I get express shipping?",
            "Do you offer gift wrapping?",
            *base,
        ]
    if page == "shop":
        return [
            "What's trending this season?",
            "Can you help me find an evening dress?",
            "What accessories go with a silk gown?",
            *base,
        ]
    return [
        "What products do you have?",
        "Tell me about Seraphine Couture",
        *base,
    ]

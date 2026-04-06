"""
Chat & Size Recommendation API Routes.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import ai_service
import database
import models
from sqlalchemy import func

router = APIRouter(prefix="/ai", tags=["AI"])


# ---------- Pydantic Schemas ----------

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatMessage] = []
    page_context: dict | None = None
    user_token: str | None = None

class MeasurementsPayload(BaseModel):
    height_cm: float | None = None
    weight_kg: float | None = None
    chest_cm: float | None = None
    waist_cm: float | None = None
    hip_cm: float | None = None
    preferences: str | None = None

class SizeRecommendRequest(BaseModel):
    product_id: str
    measurements: MeasurementsPayload


# ---------- Helpers ----------

def _serialize_products(db: Session) -> list[dict]:
    sales_rows = (
        db.query(
            models.OrderItem.product_id,
            func.coalesce(func.sum(models.OrderItem.quantity), 0).label("sold_count"),
        )
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(func.lower(models.Order.status) == "completed")
        .group_by(models.OrderItem.product_id)
        .all()
    )
    sales_map = {str(row.product_id): int(row.sold_count or 0) for row in sales_rows}
    products = db.query(models.Product).all()
    result = []
    for p in products:
        result.append({
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "description": p.description,
            "price": p.price,
            "stock": p.stock,
            "soldCount": sales_map.get(str(p.id), 0),
            "rating": p.rating,
            "reviews": p.reviews,
            "sizes": json.loads(p.sizes_json) if p.sizes_json else [],
            "colors": json.loads(p.colors_json) if p.colors_json else [],
        })
    return result


# ---------- Endpoints ----------

@router.post("/chat")
async def chat_endpoint(req: ChatRequest, db: Session = Depends(database.get_db)):
    """Chat with Seraphine AI. Returns SSE stream."""
    products = _serialize_products(db)

    history = [{"role": m.role, "content": m.content} for m in req.conversation_history]

    async def event_stream():
        try:
            async for token in ai_service.stream_chat_response(
                message=req.message,
                conversation_history=history,
                products=products,
                page_context=req.page_context,
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/chat/suggestions")
def chat_suggestions(
    page: str = Query("home"),
    product_id: str | None = Query(None),
    db: Session = Depends(database.get_db),
):
    product = None
    if product_id:
        p = db.query(models.Product).filter(models.Product.id == product_id).first()
        if p:
            product = {"name": p.name, "category": p.category, "price": p.price}
    suggestions = ai_service.get_chat_suggestions(page, product)
    return {"suggestions": suggestions}


@router.post("/size-recommend")
async def size_recommendation(req: SizeRecommendRequest, db: Session = Depends(database.get_db)):
    """Get AI size recommendation for a product."""
    p = db.query(models.Product).filter(models.Product.id == req.product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = {
        "name": p.name,
        "category": p.category,
        "description": p.description,
        "price": p.price,
        "sizes": json.loads(p.sizes_json) if p.sizes_json else [],
        "colors": json.loads(p.colors_json) if p.colors_json else [],
    }

    measurements = req.measurements.model_dump()

    result = await ai_service.get_size_recommendation(
        product=product_data,
        measurements=measurements,
    )
    return result


@router.get("/health")
async def ai_health():
    """Check Gemini API connectivity."""
    return await ai_service.check_gemini_health()

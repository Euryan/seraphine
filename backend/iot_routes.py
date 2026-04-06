"""
IoT API Routes — Real-time sensor data streaming and management.
"""

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from iot_simulator import simulator

router = APIRouter(prefix="/iot", tags=["IoT"])


@router.post("/simulator/start")
def start_simulator():
    simulator.start()
    return {"status": "running", "message": "IoT simulator started"}


@router.post("/simulator/stop")
def stop_simulator():
    simulator.stop()
    return {"status": "stopped", "message": "IoT simulator stopped"}


@router.get("/simulator/status")
def simulator_status():
    return {"running": simulator.running}


@router.get("/stream")
async def iot_event_stream():
    """SSE endpoint — streams real-time IoT events to admin dashboard."""
    queue = simulator.subscribe()

    async def event_generator():
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'message': 'IoT stream connected'})}\n\n"

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f"data: {json.dumps({'type': 'keepalive'})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            simulator.unsubscribe(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/sensors")
def get_sensors():
    """List all sensors with their current status."""
    return {"sensors": simulator.get_sensors()}


@router.get("/events")
def get_recent_events(limit: int = 50):
    """Get recent IoT events from the log."""
    events = simulator.get_recent_events(min(limit, 200))
    return {"events": events}


@router.get("/inventory/snapshot")
def get_inventory_snapshot():
    """Get the latest RFID inventory snapshot."""
    return simulator.get_inventory_snapshot()

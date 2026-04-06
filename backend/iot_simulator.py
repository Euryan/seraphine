"""
IoT Warehouse Simulator — Generates realistic RFID/sensor events for demo.
"""

import asyncio
import json
import random
from datetime import datetime, timezone
from typing import AsyncIterator

# Simulated sensors in the Seraphine warehouse
SENSORS = [
    {"id": "RFID-GATE-01", "type": "rfid_gate", "location": "Receiving Dock A", "battery": 98},
    {"id": "RFID-GATE-02", "type": "rfid_gate", "location": "Shipping Dock B", "battery": 95},
    {"id": "RFID-SHELF-01", "type": "rfid_shelf", "location": "Showroom Floor", "battery": 87},
    {"id": "RFID-SHELF-02", "type": "rfid_shelf", "location": "Main Warehouse Aisle 3", "battery": 92},
    {"id": "ENV-SENSOR-01", "type": "environmental", "location": "Silk Storage Room", "battery": 78},
    {"id": "ENV-SENSOR-02", "type": "environmental", "location": "Leather Goods Vault", "battery": 84},
]

EVENT_TYPES = [
    "stock_in",
    "stock_out",
    "stock_count",
    "temperature_reading",
    "humidity_reading",
    "movement_detected",
]

# Simulated product IDs (matching your catalog)
PRODUCT_IDS = ["1", "2", "3", "4", "5", "6", "7"]

SIZE_OPTIONS = {
    "1": ["XS", "S", "M", "L"],
    "2": ["One Size"],
    "3": ["S", "M", "L", "XL"],
    "4": ["S", "M"],
    "5": ["38", "39", "40", "41", "42"],
    "6": ["36", "37", "38", "39", "40"],
    "7": ["XS", "S", "M", "L", "XL"],
}

COLOR_OPTIONS = {
    "1": ["Midnight Black", "Champagne", "Emerald"],
    "2": ["Cognac", "Onyx"],
    "3": ["Burgundy", "Navy"],
    "4": ["Gold"],
    "5": ["Espresso", "Slate"],
    "6": ["Crystal", "Noir"],
    "7": ["Camel", "Charcoal"],
}

PRODUCT_NAMES = {
    "1": "Silk Evening Gown",
    "2": "Leather Monogram Tote",
    "3": "Velvet Smoking Jacket",
    "4": "Gold Link Bracelet",
    "5": "Suede Chelsea Boot",
    "6": "Crystal Heel Sandal",
    "7": "Cashmere Overcoat",
}


class IoTSimulator:
    def __init__(self):
        self.running = False
        self._task: asyncio.Task | None = None
        self._subscribers: list[asyncio.Queue] = []
        self._event_log: list[dict] = []
        self._sensor_states: dict[str, dict] = {}
        self._init_sensor_states()

    def _init_sensor_states(self):
        for sensor in SENSORS:
            self._sensor_states[sensor["id"]] = {
                **sensor,
                "status": "online",
                "last_reading": None,
                "last_event_time": None,
            }

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def _broadcast(self, event: dict):
        self._event_log.append(event)
        if len(self._event_log) > 500:
            self._event_log = self._event_log[-300:]

        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self._subscribers.remove(q)

    def _generate_inventory_event(self) -> dict:
        event_type = random.choices(
            ["stock_in", "stock_out", "stock_count"],
            weights=[30, 45, 25],
            k=1,
        )[0]
        product_id = random.choice(PRODUCT_IDS)
        sizes = SIZE_OPTIONS.get(product_id, ["M"])
        colors = COLOR_OPTIONS.get(product_id, ["Black"])

        sensor = random.choice([s for s in SENSORS if s["type"].startswith("rfid")])

        event = {
            "event_type": event_type,
            "sensor_id": sensor["id"],
            "location": sensor["location"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "product_id": product_id,
            "product_name": PRODUCT_NAMES.get(product_id, "Unknown"),
            "size": random.choice(sizes),
            "color": random.choice(colors),
        }

        if event_type == "stock_in":
            event["quantity_delta"] = random.randint(1, 5)
            event["description"] = f"Shipment received: {event['quantity_delta']}x {event['product_name']}"
        elif event_type == "stock_out":
            event["quantity_delta"] = -random.randint(1, 2)
            event["description"] = f"Picked for order: {abs(event['quantity_delta'])}x {event['product_name']}"
        else:
            event["quantity_delta"] = 0
            event["rfid_count"] = random.randint(0, 15)
            event["description"] = f"Audit scan: {event['rfid_count']} units of {event['product_name']} detected"

        self._sensor_states[sensor["id"]]["last_reading"] = event.get("description", "")
        self._sensor_states[sensor["id"]]["last_event_time"] = event["timestamp"]

        return event

    def _generate_environmental_event(self) -> dict:
        sensor = random.choice([s for s in SENSORS if s["type"] == "environmental"])
        is_temp = random.random() < 0.6

        if is_temp:
            temp = round(random.uniform(18.0, 24.0), 1)
            is_alert = temp < 18.5 or temp > 23.0
            event = {
                "event_type": "temperature_reading",
                "sensor_id": sensor["id"],
                "location": sensor["location"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "value": temp,
                "unit": "°C",
                "alert": is_alert,
                "description": f"Temperature: {temp}°C" + (" ⚠️ ALERT" if is_alert else ""),
            }
        else:
            humidity = round(random.uniform(40.0, 65.0), 1)
            is_alert = humidity < 42.0 or humidity > 60.0
            event = {
                "event_type": "humidity_reading",
                "sensor_id": sensor["id"],
                "location": sensor["location"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "value": humidity,
                "unit": "%",
                "alert": is_alert,
                "description": f"Humidity: {humidity}%" + (" ⚠️ ALERT" if is_alert else ""),
            }

        self._sensor_states[sensor["id"]]["last_reading"] = event["description"]
        self._sensor_states[sensor["id"]]["last_event_time"] = event["timestamp"]

        return event

    async def _run_loop(self):
        while self.running:
            if random.random() < 0.7:
                event = self._generate_inventory_event()
            else:
                event = self._generate_environmental_event()

            await self._broadcast(event)

            # Random interval: 2-8 seconds between events
            await asyncio.sleep(random.uniform(2.0, 8.0))

    def start(self):
        if self.running:
            return
        self.running = True
        self._init_sensor_states()
        self._task = asyncio.create_task(self._run_loop())

    def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            self._task = None

    def get_sensors(self) -> list[dict]:
        return list(self._sensor_states.values())

    def get_recent_events(self, limit: int = 50) -> list[dict]:
        return self._event_log[-limit:]

    def get_inventory_snapshot(self) -> dict:
        """Aggregate the latest stock counts from audit events."""
        snapshot: dict[str, dict] = {}
        for event in reversed(self._event_log):
            if event.get("event_type") == "stock_count":
                key = f"{event['product_id']}_{event.get('size','')}_{event.get('color','')}"
                if key not in snapshot:
                    snapshot[key] = {
                        "product_id": event["product_id"],
                        "product_name": event.get("product_name", ""),
                        "size": event.get("size", ""),
                        "color": event.get("color", ""),
                        "rfid_count": event.get("rfid_count", 0),
                        "last_scan": event["timestamp"],
                    }
            if len(snapshot) >= 50:
                break
        return {"items": list(snapshot.values())}


# Singleton instance
simulator = IoTSimulator()

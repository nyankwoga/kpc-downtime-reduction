"""
mock_ticketing_api.py
-----------------------
A minimal mock of a CMMS-style maintenance ticketing API, standing in
for KPC's real ticketing system until real API access is available.
The scheduler (scheduler.py) integrates against this exact interface,
so swapping in the real system later is a matter of changing the
BASE_URL + auth headers, not rewriting the scheduler.

Run:
    uvicorn mock_ticketing_api:app --port 8000

Endpoints:
    POST   /tickets            create a maintenance ticket
    GET    /tickets            list all tickets
    GET    /tickets/{id}       get one ticket
    PATCH  /tickets/{id}       update status
"""

import random
import time
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Mock KPC Ticketing API")

TICKETS: dict[str, dict] = {}
_next_id = 1


class TicketCreate(BaseModel):
    asset_id: str
    zone: str
    priority: str  # "low" | "medium" | "high"
    reason: str


class TicketUpdate(BaseModel):
    status: str


@app.post("/tickets")
def create_ticket(ticket: TicketCreate):
    global _next_id

    # simulate realistic network/processing latency for the monitoring demo
    time.sleep(random.uniform(0.05, 0.3))

    # simulate occasional transient failures (5%) so the scheduler's
    # retry/monitoring logic has something real to demonstrate
    if random.random() < 0.05:
        raise HTTPException(status_code=503, detail="Ticketing system temporarily unavailable")

    ticket_id = f"TCK-{_next_id:05d}"
    _next_id += 1

    record = {
        "ticket_id": ticket_id,
        "asset_id": ticket.asset_id,
        "zone": ticket.zone,
        "priority": ticket.priority,
        "reason": ticket.reason,
        "status": "Open",
        "created_at": datetime.utcnow().isoformat(),
    }
    TICKETS[ticket_id] = record
    return record


@app.get("/tickets")
def list_tickets():
    return list(TICKETS.values())


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    if ticket_id not in TICKETS:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return TICKETS[ticket_id]


@app.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: str, update: TicketUpdate):
    if ticket_id not in TICKETS:
        raise HTTPException(status_code=404, detail="Ticket not found")
    TICKETS[ticket_id]["status"] = update.status
    return TICKETS[ticket_id]


@app.get("/health")
def health():
    return {"status": "ok", "ticket_count": len(TICKETS)}

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/legs", tags=["legs"])

# Leg model for input validation
class Leg(BaseModel):
    name: str
    trip_id: int | None = None
    type: str
    start_node_id: int | None = None
    end_node_id: int | None = None
    #TODO: figure out how to add geography points
    miles: float
    notes: str | None = None

# @router.get("/")
# def get_legs(trip_id: int)
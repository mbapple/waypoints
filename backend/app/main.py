# backend/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from routers import trips
from routers import nodes
from routers import legs
from routers import stops
from routers import car_details
from routers import flight_details
from routers import photos
from routers import admin
from routers import stop_categories
from routers import search
from routers import adventures
from routers import lists


app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React dev server TODO: fix this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trips.router)
app.include_router(nodes.router)
app.include_router(legs.router)
app.include_router(stops.router)
app.include_router(car_details.router)
app.include_router(flight_details.router)
app.include_router(photos.router)
app.include_router(admin.router)
app.include_router(stop_categories.router)
app.include_router(search.router)
app.include_router(adventures.router)
app.include_router(lists.router)

# Serve uploaded photos statically
app.mount("/uploads", StaticFiles(directory="/workspaces/src/uploads"), name="uploads")
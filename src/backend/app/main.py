# backend/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from src.backend.app.routers import trips
from src.backend.app.routers import nodes
from src.backend.app.routers import legs
from src.backend.app.routers import stops
from src.backend.app.routers import car_details
from src.backend.app.routers import flight_details
from src.backend.app.routers import photos
from src.backend.app.routers import admin
from src.backend.app.routers import stop_categories
from src.backend.app.routers import search
from src.backend.app.routers import adventures
from src.backend.app.routers import lists

app = FastAPI()
#app = FastAPI(redirect_slashes=False)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    #allow_origins=["*"], # Allow all origins for development
    allow_origins=["http://waypoints_frontend:3000"],  # Should only allow frontend container to access
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
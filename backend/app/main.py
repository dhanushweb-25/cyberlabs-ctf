from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, challenges, scoreboard, admin
from .config import settings
from .seed import seed_db
from .services.scheduler import scheduler
from .providers.manager import provider_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    # Seed the database
    seed_db()
    # Ensure Docker challenge images are ready/built
    provider_manager.ensure_images()
    # Start container expiry scheduler
    scheduler.start()
    yield
    # Stop container expiry scheduler on shutdown
    scheduler.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for the TryHackMe-inspired CTF learning platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS to allow frontend calls
cors_origins_list = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include Routers
app.include_router(auth.router)
app.include_router(challenges.router)
app.include_router(scoreboard.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "online",
        "documentation": "/docs"
    }


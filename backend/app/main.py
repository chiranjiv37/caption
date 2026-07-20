"""FastAPI main application."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import auth, projects, series, assets

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    if settings.is_development:
        # Create tables in development (for quick testing)
        # In production, use Alembic migrations
        # await init_db()
        pass
    yield
    # Shutdown
    pass


# Create FastAPI app
app = FastAPI(
    title="Captions Studio API",
    description="Backend API for the Captions Studio video caption editing platform",
    version="1.0.0",
    docs_url="/api/v1/docs" if settings.is_development else None,
    redoc_url="/api/v1/redoc" if settings.is_development else None,
    lifespan=lifespan,
    redirect_slashes=False,
)

print(f"Starting FastAPI app in {settings.app_env} mode. Debug: {settings.debug}")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(series.router, prefix="/api/v1")
app.include_router(assets.router, prefix="/api/v1")

for route in app.routes:
    methods = getattr(route, "methods", [])
    print(methods, route.path)


# Root endpoint
@app.get("/api/v1", tags=["Root"])
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Captions Studio API",
        "version": "1.0.0",
        "docs": "/docs",
    }

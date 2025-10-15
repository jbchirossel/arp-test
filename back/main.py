from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.config import settings
from app.api.endpoints import couts_salariaux, fec_analysis

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API router versionné
app.include_router(api_router, prefix=settings.API_V1_STR)

# Alias non versionné pour compatibilité front actuelle
app.include_router(couts_salariaux.router, prefix="/analyse/couts-salariaux", tags=["coûts-salariaux (alias)"])
app.include_router(fec_analysis.router, prefix="/analyse/fec-analysis", tags=["fec-analysis (alias)"])


@app.get("/")
async def root():
    return {"message": "Welcome to ARP API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"} 
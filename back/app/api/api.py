from fastapi import APIRouter
from .endpoints import auth, gantt, couts_salariaux

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(gantt.router, prefix="/gantt", tags=["gantt"])
api_router.include_router(couts_salariaux.router, prefix="/couts-salariaux", tags=["coûts-salariaux"]) 
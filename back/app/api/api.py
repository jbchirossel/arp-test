from fastapi import APIRouter
from .endpoints import auth, gantt, couts_salariaux, fec_analysis, solune

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(gantt.router, prefix="/gantt", tags=["gantt"])
api_router.include_router(couts_salariaux.router, prefix="/couts-salariaux", tags=["coûts-salariaux"])
api_router.include_router(fec_analysis.router, prefix="/fec-analysis", tags=["fec-analysis"])
api_router.include_router(solune.router, prefix="/solune", tags=["solune"]) 
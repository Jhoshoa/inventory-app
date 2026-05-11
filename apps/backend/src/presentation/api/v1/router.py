from fastapi import APIRouter
from src.presentation.api.v1 import products, sales, photos, sync, auth, store, exchange_rates

api_v1_router = APIRouter()
api_v1_router.include_router(products.router)
api_v1_router.include_router(sales.router)
api_v1_router.include_router(photos.router)
api_v1_router.include_router(sync.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(store.router)
api_v1_router.include_router(exchange_rates.router)

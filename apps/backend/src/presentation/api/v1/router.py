from fastapi import APIRouter
from src.presentation.api.v1 import (
    auth,
    dashboard,
    exchange_rates,
    exports,
    inventory_imports,
    photos,
    products,
    reports,
    sales,
    stock_movements,
    store,
    store_day,
    sync,
    users,
)

api_v1_router = APIRouter()
api_v1_router.include_router(products.router)
api_v1_router.include_router(sales.router)
api_v1_router.include_router(photos.router)
api_v1_router.include_router(sync.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(store.router)
api_v1_router.include_router(store_day.router)
api_v1_router.include_router(exchange_rates.router)
api_v1_router.include_router(dashboard.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(inventory_imports.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(stock_movements.router)
api_v1_router.include_router(exports.router)

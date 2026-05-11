from contextlib import asynccontextmanager
from src.config.database import AsyncSessionLocal


@asynccontextmanager
async def get_session():
    async with AsyncSessionLocal() as session:
        yield session

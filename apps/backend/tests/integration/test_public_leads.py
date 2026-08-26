from sqlalchemy import select

from src.infrastructure.database.models.lead_model import LeadModel
from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    lead_rate_limiter,
)


async def test_create_lead_succeeds_without_authentication(client, db_session):
    response = await client.post(
        "/api/v1/public/leads",
        json={
            "name": "Maria Perez",
            "phone": "+591 700 00000",
            "store_name": "Tienda Maria",
            "email": "maria@example.com",
            "business_type": "tienda",
            "message": "Quiero una demo",
            "source_page": "/",
        },
        headers={"x-forwarded-for": "10.0.0.1"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Maria Perez"

    result = await db_session.execute(select(LeadModel))
    saved = result.scalars().all()
    assert len(saved) == 1
    assert saved[0].phone == "+591 700 00000"


async def test_create_lead_rejects_invalid_email(client):
    response = await client.post(
        "/api/v1/public/leads",
        json={"name": "Juan", "phone": "70000000", "email": "no-es-un-correo"},
        headers={"x-forwarded-for": "10.0.0.2"},
    )

    assert response.status_code == 422


async def test_create_lead_rejects_missing_phone(client):
    response = await client.post(
        "/api/v1/public/leads",
        json={"name": "Juan"},
        headers={"x-forwarded-for": "10.0.0.3"},
    )

    assert response.status_code == 422


async def test_create_lead_honeypot_does_not_persist(client, db_session):
    response = await client.post(
        "/api/v1/public/leads",
        json={
            "name": "Bot",
            "phone": "70000000",
            "website": "http://spam.example.com",
        },
        headers={"x-forwarded-for": "10.0.0.4"},
    )

    assert response.status_code == 201
    result = await db_session.execute(select(LeadModel))
    assert result.scalars().all() == []


async def test_create_lead_is_rate_limited_per_ip(client):
    lead_rate_limiter._hits.clear()
    ip = "10.0.0.5"
    payload = {"name": "Repetido", "phone": "70000000"}

    for _ in range(3):
        response = await client.post(
            "/api/v1/public/leads",
            json=payload,
            headers={"x-forwarded-for": ip},
        )
        assert response.status_code == 201

    blocked = await client.post(
        "/api/v1/public/leads",
        json=payload,
        headers={"x-forwarded-for": ip},
    )
    assert blocked.status_code == 429

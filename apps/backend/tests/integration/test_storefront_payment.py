from src.application.ports.photo_storage import IPhotoStorage
from src.main import app
from src.presentation import dependencies

_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 32


class _FakePhotoStorage(IPhotoStorage):
    def __init__(self):
        self.uploaded: list[str] = []
        self.deleted: list[str] = []

    async def upload(self, image_bytes: bytes, public_id: str) -> str:
        self.uploaded.append(public_id)
        return f"https://res.cloudinary.com/demo/image/upload/{public_id}.png"

    async def delete(self, public_id: str) -> None:
        self.deleted.append(public_id)


async def _enable_storefront(client, **overrides) -> dict:
    payload = {"storefront_slug": "ferreteria-lopez", "storefront_enabled": True, **overrides}
    response = await client.patch("/api/v1/store", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


async def test_update_payment_instructions(client):
    response = await client.patch(
        "/api/v1/store", json={"storefront_payment_instructions": "Paga con este QR y avisanos por WhatsApp"}
    )
    assert response.status_code == 200
    assert response.json()["storefront_payment_instructions"] == "Paga con este QR y avisanos por WhatsApp"


async def test_upload_and_delete_payment_qr(client):
    fake_storage = _FakePhotoStorage()
    app.dependency_overrides[dependencies.get_photo_storage] = lambda: fake_storage
    try:
        upload = await client.post(
            "/api/v1/store/payment-qr",
            files={"file": ("qr.png", _PNG_BYTES, "image/png")},
        )
        assert upload.status_code == 200, upload.text
        body = upload.json()
        assert body["storefront_payment_qr_url"].startswith("https://res.cloudinary.com/")
        assert len(fake_storage.uploaded) == 1

        delete = await client.delete("/api/v1/store/payment-qr")
        assert delete.status_code == 200
        assert delete.json()["storefront_payment_qr_url"] is None
        assert len(fake_storage.deleted) == 1
    finally:
        app.dependency_overrides.pop(dependencies.get_photo_storage, None)


async def test_upload_payment_qr_rejects_invalid_type(client):
    fake_storage = _FakePhotoStorage()
    app.dependency_overrides[dependencies.get_photo_storage] = lambda: fake_storage
    try:
        response = await client.post(
            "/api/v1/store/payment-qr",
            files={"file": ("qr.txt", b"not an image", "text/plain")},
        )
        assert response.status_code == 415
    finally:
        app.dependency_overrides.pop(dependencies.get_photo_storage, None)


async def test_public_storefront_exposes_payment_qr_and_instructions(client):
    fake_storage = _FakePhotoStorage()
    app.dependency_overrides[dependencies.get_photo_storage] = lambda: fake_storage
    try:
        await _enable_storefront(client, storefront_payment_instructions="Paga y avisanos")
        await client.post("/api/v1/store/payment-qr", files={"file": ("qr.png", _PNG_BYTES, "image/png")})
    finally:
        app.dependency_overrides.pop(dependencies.get_photo_storage, None)

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez")

    assert response.status_code == 200
    body = response.json()
    assert body["payment_instructions"] == "Paga y avisanos"
    assert body["payment_qr_url"].startswith("https://res.cloudinary.com/")


async def test_mark_request_payment_confirmed(client):
    await _enable_storefront(client)
    product_response = await client.post("/api/v1/products", json={"name": "Martillo", "price": "45.00", "stock": 5})
    product_id = product_response.json()["id"]
    created = await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
    )
    request_id = created.json()["id"]
    assert created.json()["payment_confirmed"] is False

    response = await client.patch(
        f"/api/v1/storefront-requests/{request_id}/payment", json={"payment_confirmed": True}
    )

    assert response.status_code == 200
    assert response.json()["payment_confirmed"] is True

    listed = await client.get("/api/v1/storefront-requests")
    assert listed.json()["items"][0]["payment_confirmed"] is True


async def test_mark_payment_confirmed_rejects_unknown_request(client):
    response = await client.patch(
        "/api/v1/storefront-requests/00000000-0000-0000-0000-000000000000/payment",
        json={"payment_confirmed": True},
    )
    assert response.status_code == 404

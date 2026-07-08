# API Request Body Examples

Use these JSON files from `apps/backend/examples/requests` when testing the FastAPI backend manually.

Base URL for local development:

```text
http://localhost:8001/api/v1
```

When `DEBUG=true`, protected endpoints can be called without an `Authorization` header. In non-debug environments, send:

```text
Authorization: Bearer <access_token>
```

## JSON Endpoints

| File | Method | Path |
|---|---|---|
| `auth-login.json` | `POST` | `/auth/login` |
| `auth-register.json` | `POST` | `/auth/register` |
| `auth-refresh.query.json` | `POST` | `/auth/refresh?refresh_token=dev-refresh-123` |
| `products-create.json` | `POST` | `/products` |
| `products-update.json` | `PATCH` | `/products/{product_id}` |
| `products-adjust-stock-add.json` | `PATCH` | `/products/{product_id}/stock` |
| `products-adjust-stock-subtract.json` | `PATCH` | `/products/{product_id}/stock` |
| `sales-create.json` | `POST` | `/sales` |
| `seeded-sales-create.json` | `POST` | `/sales` |
| `seeded-products-adjust-stock.json` | `PATCH` | `/products/11111111-1111-1111-1111-111111111111/stock` |
| `store-update.json` | `PATCH` | `/store` |
| `exchange-rates-upsert.json` | `POST` | `/exchange-rates` |
| `sync-push-product-upsert.json` | `POST` | `/sync/push` |
| `sync-push-product-delete.json` | `POST` | `/sync/push` |
| `sync-pull.json` | `POST` | `/sync/pull` |

## Recommended Testing Sequence

Some endpoints depend on records created by previous endpoints. Use this order when testing manually:

1. Start the API with `DEBUG=true` for local testing.
2. Optional: call `POST /auth/dev-login`.
   - In DEBUG mode, protected endpoints also work without `Authorization`.
   - In non-debug environments, use the returned `access_token` as `Authorization: Bearer <token>`.
3. Ensure a store exists for the authenticated user.
   - The automated tests seed a dev store.
   - A real database must have a `stores` row matching the user's `store_id`.
4. Create one or more products with `products-create.json`.
5. Copy the returned product `id`.
6. Use that product `id` in:
   - `PATCH /products/{product_id}`
   - `PATCH /products/{product_id}/stock`
   - `POST /sales`
7. Create a sale with `sales-create.json`.
   - Replace the sample `product_id` values with real product IDs.
   - A sale cannot be created before products exist.
   - Creating a sale reduces product stock.
8. Test sync with `sync-push-product-upsert.json` and `sync-pull.json`.
9. Insert exchange rates any time with `exchange-rates-upsert.json`.
   - Exchange rates are independent from stores/products/sales in the current DB.

## Optional Seed Data

For faster manual testing, seed deterministic demo data before calling the API:

```powershell
cd apps/backend
python -m alembic upgrade head
python -m src.infrastructure.database.seed.dev_seed
```

Seeded IDs:

| Record | ID |
|---|---|
| Store | `00000000-0000-0000-0000-000000000101` |
| User | `00000000-0000-0000-0000-000000000001` |
| Arroz 1kg | `11111111-1111-1111-1111-111111111111` |
| Aceite 1l | `22222222-2222-2222-2222-222222222222` |
| Fideo 400g | `33333333-3333-3333-3333-333333333333` |

After seeding, you can test sales immediately with:

```text
POST /api/v1/sales
Body: seeded-sales-create.json
```

And test stock adjustment immediately with:

```text
PATCH /api/v1/products/11111111-1111-1111-1111-111111111111/stock
Body: seeded-products-adjust-stock.json
```

## DB Relationship Summary

The current ERD is documented as PlantUML here:

```text
apps/backend/diagrams/current-db-erd.puml
```

Current table dependencies:

| Table | Depends on | Notes |
|---|---|---|
| `stores` | none | Root tenant/business table. |
| `users` | `stores` | `users.store_id -> stores.id`. |
| `products` | `stores` | Products belong to one store. |
| `sales` | `stores` | Sales belong to one store. |
| `sale_items` | `sales`, `products` | Sale details require an existing sale and product. |
| `exchange_rates` | none | Independent reference table with composite PK `(date, source)`. |

Practical insert order for a complete POS flow:

```text
stores -> users -> products -> sales -> sale_items
```

The API creates `sales` and `sale_items` together through `POST /sales`, so manual API testing usually only needs:

```text
store exists -> create product -> create sale
```

## Endpoints Without JSON Body

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/dev-login` | No body. Only works when `DEBUG=true`. |
| `GET` | `/products` | No body. |
| `GET` | `/products/{product_id}` | No body. |
| `DELETE` | `/products/{product_id}` | No body. |
| `GET` | `/sales` | No body. |
| `GET` | `/sales/{sale_id}` | No body. |
| `GET` | `/store` | No body. |
| `GET` | `/exchange-rates` | No body. |

## Multipart Endpoints

There are no multipart endpoints in the current MVP API. Product photo upload will be added as a dedicated product feature in a future sprint.

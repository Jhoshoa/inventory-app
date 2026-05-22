from typing import Any


class ApplicationError(Exception):
    status_code = 400
    error = "application_error"

    def __init__(self, detail: str, extra: dict[str, Any] | None = None):
        self.detail = detail
        self.extra = extra or {}
        super().__init__(detail)


class NotFoundError(ApplicationError):
    status_code = 404
    error = "not_found"


class ConflictError(ApplicationError):
    status_code = 409
    error = "conflict"


class StockConflictError(ConflictError):
    error = "stock_conflict"

    def __init__(
        self,
        *,
        product_id: str,
        product_name: str,
        available_stock: int,
        requested_quantity: int,
    ):
        detail = (
            f"Stock insuficiente para {product_name}: "
            f"disponible {available_stock}, solicitado {requested_quantity}"
        )
        super().__init__(
            detail,
            extra={
                "stock_conflicts": [
                    {
                        "product_id": product_id,
                        "product_name": product_name,
                        "available_stock": available_stock,
                        "requested_quantity": requested_quantity,
                    }
                ]
            },
        )


class UnauthorizedError(ApplicationError):
    status_code = 401
    error = "unauthorized"


class ForbiddenError(ApplicationError):
    status_code = 403
    error = "forbidden"

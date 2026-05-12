class ApplicationError(Exception):
    status_code = 400
    error = "application_error"

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(ApplicationError):
    status_code = 404
    error = "not_found"


class ConflictError(ApplicationError):
    status_code = 409
    error = "conflict"


class UnauthorizedError(ApplicationError):
    status_code = 401
    error = "unauthorized"

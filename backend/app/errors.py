class ApiError(Exception):
    """에러는 항상 {"error": {"code", "message"}} 모양으로 반환."""

    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


def api_error(status_code: int, code: str, message: str) -> ApiError:
    return ApiError(status_code, code, message)

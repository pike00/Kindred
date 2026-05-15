class KindredError(Exception):
    """Base error for all Kindred client failures."""


class KindredAuthError(KindredError):
    """API key rejected or missing."""


class KindredNotFoundError(KindredError):
    """Requested resource does not exist."""


class KindredAPIError(KindredError):
    """Non-2xx response from the API."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"HTTP {status_code}: {detail}")

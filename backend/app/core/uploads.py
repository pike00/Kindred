"""Bounded helpers for request file uploads."""

from fastapi import HTTPException, UploadFile


async def read_upload_bounded(
    file: UploadFile,
    *,
    max_bytes: int,
    label: str = "Upload",
) -> bytes:
    """Read an upload without allowing it to exceed ``max_bytes``."""
    if file.size is not None and file.size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"{label} exceeds the {max_bytes}-byte limit",
        )
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"{label} exceeds the {max_bytes}-byte limit",
        )
    return content


def ensure_item_limit(*, count: int, max_items: int, label: str) -> None:
    """Reject parsed uploads with too many rows, events, or cards."""
    if count > max_items:
        raise HTTPException(
            status_code=413,
            detail=f"{label} exceeds the {max_items}-item limit",
        )

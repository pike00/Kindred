"""Geocoding service using Nominatim (OpenStreetMap) for address geocoding.

Privacy note: This service sends address data to Nominatim (OpenStreetMap) for geocoding.
Nominatim's usage policy requires proper user-agent identification and rate limiting.
See: https://operations.osmfoundation.org/policies/nominatim/
"""

import logging
import time

import httpx

logger = logging.getLogger(__name__)

# Nominatim requires a meaningful user-agent
NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
USER_AGENT = "personal-crm/0.1 (contact@example.com)"  # TODO: Make configurable

# Rate limiting: Nominatim asks for max 1 request per second
MIN_REQUEST_INTERVAL = 1.0  # seconds
_last_request_time = 0.0


def _rate_limit() -> None:
    """Ensure we don't exceed Nominatim's rate limit."""
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    if elapsed < MIN_REQUEST_INTERVAL:
        time.sleep(MIN_REQUEST_INTERVAL - elapsed)
    _last_request_time = time.time()


def geocode_address(
    street: str | None = None,
    city: str | None = None,
    region: str | None = None,
    postal_code: str | None = None,
    country: str | None = None,
) -> tuple[float, float] | None:
    """
    Geocode an address using Nominatim (OpenStreetMap).

    Returns (latitude, longitude) or None if geocoding fails.

    Privacy: The address components are sent to Nominatim's public API.
    No API key is required, but we respect rate limits and identify ourselves.
    """
    # Build the address query
    parts = [street, city, region, postal_code, country]
    address_query = ", ".join(p for p in parts if p)

    if not address_query.strip():
        logger.warning("Empty address query for geocoding")
        return None

    try:
        _rate_limit()

        response = httpx.get(
            f"{NOMINATIM_BASE_URL}/search",
            params={
                "q": address_query,
                "format": "json",
                "limit": 1,
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=10.0,
        )
        response.raise_for_status()

        data = response.json()
        if not data:
            logger.info(f"No geocoding results for address: {address_query}")
            return None

        result = data[0]
        lat = float(result["lat"])
        lon = float(result["lon"])

        logger.info(f"Geocoded '{address_query}' -> ({lat}, {lon})")
        return (lat, lon)

    except httpx.TimeoutException:
        logger.error(f"Geocoding timeout for address: {address_query}")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"Geocoding HTTP error: {e.response.status_code}")
        return None
    except (KeyError, ValueError, IndexError) as e:
        logger.error(f"Geocoding parse error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected geocoding error: {e}")
        return None


def reverse_geocode(lat: float, lon: float) -> dict | None:
    """
    Reverse geocode coordinates to an address using Nominatim.

    Returns address details dict or None if reverse geocoding fails.
    """
    try:
        _rate_limit()

        response = httpx.get(
            f"{NOMINATIM_BASE_URL}/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=10.0,
        )
        response.raise_for_status()

        data = response.json()
        return data.get("address")

    except Exception as e:
        logger.error(f"Reverse geocoding error: {e}")
        return None

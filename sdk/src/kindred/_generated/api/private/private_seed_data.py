from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.private_seed_data_response_private_seed_data import PrivateSeedDataResponsePrivateSeedData
from ...types import UNSET, Unset
from typing import cast


def _get_kwargs(
    *,
    count: int | Unset = 50,
    reset: bool | Unset = False,
    rng_seed: int | None | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["count"] = count

    params["reset"] = reset

    json_rng_seed: int | None | Unset
    if isinstance(rng_seed, Unset):
        json_rng_seed = UNSET
    else:
        json_rng_seed = rng_seed
    params["rng_seed"] = json_rng_seed

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/private/seed",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | PrivateSeedDataResponsePrivateSeedData | None:
    if response.status_code == 200:
        response_200 = PrivateSeedDataResponsePrivateSeedData.from_dict(response.json())

        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[HTTPValidationError | PrivateSeedDataResponsePrivateSeedData]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    count: int | Unset = 50,
    reset: bool | Unset = False,
    rng_seed: int | None | Unset = UNSET,
) -> Response[HTTPValidationError | PrivateSeedDataResponsePrivateSeedData]:
    """Seed Data

     Seed the database with fake demo data. Only available in local environment.

    Args:
        count (int | Unset): Number of contacts to seed Default: 50.
        reset (bool | Unset): Wipe existing data before seeding Default: False.
        rng_seed (int | None | Unset): RNG seed for determinism

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | PrivateSeedDataResponsePrivateSeedData]
    """

    kwargs = _get_kwargs(
        count=count,
        reset=reset,
        rng_seed=rng_seed,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    count: int | Unset = 50,
    reset: bool | Unset = False,
    rng_seed: int | None | Unset = UNSET,
) -> HTTPValidationError | PrivateSeedDataResponsePrivateSeedData | None:
    """Seed Data

     Seed the database with fake demo data. Only available in local environment.

    Args:
        count (int | Unset): Number of contacts to seed Default: 50.
        reset (bool | Unset): Wipe existing data before seeding Default: False.
        rng_seed (int | None | Unset): RNG seed for determinism

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | PrivateSeedDataResponsePrivateSeedData
    """

    return sync_detailed(
        client=client,
        count=count,
        reset=reset,
        rng_seed=rng_seed,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    count: int | Unset = 50,
    reset: bool | Unset = False,
    rng_seed: int | None | Unset = UNSET,
) -> Response[HTTPValidationError | PrivateSeedDataResponsePrivateSeedData]:
    """Seed Data

     Seed the database with fake demo data. Only available in local environment.

    Args:
        count (int | Unset): Number of contacts to seed Default: 50.
        reset (bool | Unset): Wipe existing data before seeding Default: False.
        rng_seed (int | None | Unset): RNG seed for determinism

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | PrivateSeedDataResponsePrivateSeedData]
    """

    kwargs = _get_kwargs(
        count=count,
        reset=reset,
        rng_seed=rng_seed,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    count: int | Unset = 50,
    reset: bool | Unset = False,
    rng_seed: int | None | Unset = UNSET,
) -> HTTPValidationError | PrivateSeedDataResponsePrivateSeedData | None:
    """Seed Data

     Seed the database with fake demo data. Only available in local environment.

    Args:
        count (int | Unset): Number of contacts to seed Default: 50.
        reset (bool | Unset): Wipe existing data before seeding Default: False.
        rng_seed (int | None | Unset): RNG seed for determinism

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | PrivateSeedDataResponsePrivateSeedData
    """

    return (
        await asyncio_detailed(
            client=client,
            count=count,
            reset=reset,
            rng_seed=rng_seed,
        )
    ).parsed

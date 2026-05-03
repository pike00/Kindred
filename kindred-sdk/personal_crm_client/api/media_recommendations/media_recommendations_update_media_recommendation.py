from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.media_recommendation_public import MediaRecommendationPublic
from ...models.media_recommendation_update import MediaRecommendationUpdate
from typing import cast
from uuid import UUID



def _get_kwargs(
    rec_id: UUID,
    *,
    body: MediaRecommendationUpdate,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}


    

    

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/media-recommendations/{rec_id}".format(rec_id=quote(str(rec_id), safe=""),),
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> HTTPValidationError | MediaRecommendationPublic | None:
    if response.status_code == 200:
        response_200 = MediaRecommendationPublic.from_dict(response.json())



        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())



        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[HTTPValidationError | MediaRecommendationPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    rec_id: UUID,
    *,
    client: AuthenticatedClient,
    body: MediaRecommendationUpdate,

) -> Response[HTTPValidationError | MediaRecommendationPublic]:
    """ Update Media Recommendation

     Update a media recommendation.

    Args:
        rec_id (UUID):
        body (MediaRecommendationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MediaRecommendationPublic]
     """


    kwargs = _get_kwargs(
        rec_id=rec_id,
body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    rec_id: UUID,
    *,
    client: AuthenticatedClient,
    body: MediaRecommendationUpdate,

) -> HTTPValidationError | MediaRecommendationPublic | None:
    """ Update Media Recommendation

     Update a media recommendation.

    Args:
        rec_id (UUID):
        body (MediaRecommendationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MediaRecommendationPublic
     """


    return sync_detailed(
        rec_id=rec_id,
client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    rec_id: UUID,
    *,
    client: AuthenticatedClient,
    body: MediaRecommendationUpdate,

) -> Response[HTTPValidationError | MediaRecommendationPublic]:
    """ Update Media Recommendation

     Update a media recommendation.

    Args:
        rec_id (UUID):
        body (MediaRecommendationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MediaRecommendationPublic]
     """


    kwargs = _get_kwargs(
        rec_id=rec_id,
body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    rec_id: UUID,
    *,
    client: AuthenticatedClient,
    body: MediaRecommendationUpdate,

) -> HTTPValidationError | MediaRecommendationPublic | None:
    """ Update Media Recommendation

     Update a media recommendation.

    Args:
        rec_id (UUID):
        body (MediaRecommendationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MediaRecommendationPublic
     """


    return (await asyncio_detailed(
        rec_id=rec_id,
client=client,
body=body,

    )).parsed

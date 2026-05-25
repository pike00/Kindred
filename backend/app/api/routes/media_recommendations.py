"""Media recommendation management routes."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_media_recommendation
from app.models import (
    Contact,
    MediaRecommendation,
    MediaRecommendationCreate,
    MediaRecommendationPublic,
    MediaRecommendationsPublic,
    MediaRecommendationUpdate,
    Ok,
)

router = APIRouter(prefix="/media-recommendations", tags=["media-recommendations"])


@router.get("/contact/{contact_id}", response_model=MediaRecommendationsPublic)
def list_media_recommendations(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> MediaRecommendationsPublic:
    """List media recommendations for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = (
        select(MediaRecommendation)
        .where(MediaRecommendation.contact_id == contact_id)
        .order_by(MediaRecommendation.created_at.desc())  # type: ignore[attr-defined]
    )
    recs = session.exec(statement).all()

    return MediaRecommendationsPublic(
        data=[MediaRecommendationPublic.model_validate(r) for r in recs],
        count=len(recs),
    )


@router.post("/", response_model=MediaRecommendationPublic)
def create_media_recommendation_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    rec_in: MediaRecommendationCreate,
) -> MediaRecommendationPublic:
    """Create a new media recommendation."""
    contact = session.get(Contact, rec_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    rec = create_media_recommendation(
        session=session, rec_in=rec_in, owner_id=current_user.id
    )
    return MediaRecommendationPublic.model_validate(rec)


@router.patch("/{rec_id}", response_model=MediaRecommendationPublic)
def update_media_recommendation(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    rec_id: uuid.UUID,
    rec_in: MediaRecommendationUpdate,
) -> MediaRecommendationPublic:
    """Update a media recommendation."""
    rec = session.get(MediaRecommendation, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Media recommendation not found")
    if rec.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = rec_in.model_dump(exclude_unset=True)
    rec.sqlmodel_update(update_data)
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return MediaRecommendationPublic.model_validate(rec)


@router.delete("/{rec_id}", response_model=Ok)
def delete_media_recommendation(
    session: SessionDep,
    current_user: CurrentUser,
    rec_id: uuid.UUID,
) -> Ok:
    """Delete a media recommendation."""
    rec = session.get(MediaRecommendation, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Media recommendation not found")
    if rec.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(rec)
    session.commit()
    return Ok()

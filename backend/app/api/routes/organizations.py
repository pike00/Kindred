"""Organization management routes."""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Organization,
    OrganizationCreate,
    OrganizationPublic,
    OrganizationUpdate,
    OrganizationsPublic,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/", response_model=OrganizationsPublic)
def list_organizations(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all organizations for the current user."""
    statement = (
        select(Organization)
        .where(Organization.owner_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    organizations = session.exec(statement).all()

    count_statement = select(func.count(Organization.id)).where(
        Organization.owner_id == current_user.id
    )
    count = session.exec(count_statement).one()

    return OrganizationsPublic(
        data=[OrganizationPublic.model_validate(o) for o in organizations],
        count=count,
    )


@router.post("/", response_model=OrganizationPublic)
def create_organization(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    organization_in: OrganizationCreate,
) -> Any:
    """Create a new organization."""
    # Check for duplicate by trimmed/lowercased name per owner
    existing = session.exec(
        select(Organization).where(
            Organization.owner_id == current_user.id,
            func.lower(Organization.name) == organization_in.name.strip().lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An organization with this name already exists.",
        )

    organization = Organization.model_validate(
        organization_in, update={"owner_id": current_user.id}
    )
    session.add(organization)
    session.commit()
    session.refresh(organization)
    return OrganizationPublic.model_validate(organization)


@router.get("/{organization_id}", response_model=OrganizationPublic)
def get_organization(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    organization_id: uuid.UUID,
) -> Any:
    """Get a specific organization."""
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    if organization.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return OrganizationPublic.model_validate(organization)


@router.patch("/{organization_id}", response_model=OrganizationPublic)
def update_organization(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    organization_id: uuid.UUID,
    organization_in: OrganizationUpdate,
) -> Any:
    """Update an organization."""
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    if organization.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Check for duplicate name if name is being updated
    if organization_in.name is not None:
        existing = session.exec(
            select(Organization).where(
                Organization.owner_id == current_user.id,
                func.lower(Organization.name) == organization_in.name.strip().lower(),
                Organization.id != organization_id,
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="An organization with this name already exists.",
            )

    update_data = organization_in.model_dump(exclude_unset=True)
    organization.sqlmodel_update(update_data)
    session.add(organization)
    session.commit()
    session.refresh(organization)
    return OrganizationPublic.model_validate(organization)


@router.delete("/{organization_id}")
def delete_organization(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    organization_id: uuid.UUID,
) -> Any:
    """Delete an organization. Contacts linked to it will have organization_id set to NULL."""
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    if organization.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(organization)
    session.commit()
    return {"ok": True}

"""Relationship graph endpoints."""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import visible_contact_ids
from app.models import Contact, Relationship

router = APIRouter(prefix="/graph", tags=["graph"])


def _build_graph(session: SessionDep, user: CurrentUser, depth: int = 2) -> dict:
    """Build a graph of contacts and relationships up to depth hops."""
    visible_ids_stmt = select(Contact.id).where(
        Contact.id.in_(visible_contact_ids(user))
    )
    visible_ids = set(session.exec(visible_ids_stmt).all())

    if not visible_ids:
        return {"nodes": [], "edges": []}

    visited = set()
    frontier = visible_ids.copy()
    current_depth = 0

    while current_depth < depth and frontier:
        new_frontier = set()

        rels_stmt = select(Relationship).where(Relationship.contact_id.in_(frontier))
        relationships = session.exec(rels_stmt).all()

        for rel in relationships:
            target_id = rel.related_contact_id
            if target_id not in visited and target_id not in frontier:
                if target_id in visible_ids:
                    new_frontier.add(target_id)

        inv_rels_stmt = select(Relationship).where(
            Relationship.related_contact_id.in_(frontier)
        )
        inv_relationships = session.exec(inv_rels_stmt).all()

        for rel in inv_relationships:
            source_id = rel.contact_id
            if source_id not in visited and source_id not in frontier:
                if source_id in visible_ids:
                    new_frontier.add(source_id)

        visited.update(frontier)
        frontier = new_frontier
        current_depth += 1

    all_contact_ids = visited | visible_ids

    if all_contact_ids:
        contacts_stmt = select(Contact).where(Contact.id.in_(all_contact_ids))
        contacts = session.exec(contacts_stmt).all()
    else:
        contacts = []

    nodes = []
    for c in contacts:
        name_parts = [c.first_name, c.last_name]
        label = " ".join([p for p in name_parts if p]) or "(unnamed)"
        nodes.append(
            {
                "id": str(c.id),
                "label": label,
                "avatar_url": c.avatar_url,
                "company": c.company,
                "is_favorite": c.is_favorite,
            }
        )

    if all_contact_ids:
        edges_stmt = select(Relationship).where(
            Relationship.contact_id.in_(all_contact_ids),
            Relationship.related_contact_id.in_(all_contact_ids),
        )
        relationships = session.exec(edges_stmt).all()
    else:
        relationships = []

    edges = []
    seen_pairs = set()
    for rel in relationships:
        pair_key = tuple(sorted([str(rel.contact_id), str(rel.related_contact_id)]))
        if pair_key in seen_pairs:
            continue
        seen_pairs.add(pair_key)
        edges.append(
            {
                "source": str(rel.contact_id),
                "target": str(rel.related_contact_id),
                "label": rel.relationship_type,
            }
        )

    return {"nodes": nodes, "edges": edges}


def _build_graph_for_root(
    session: SessionDep, visible_ids: set, root_id: uuid.UUID, depth: int
) -> dict:
    """Build a graph starting from a specific root contact."""
    visited = {root_id}
    frontier = {root_id}
    current_depth = 0

    while current_depth < depth and frontier:
        new_frontier = set()

        rels_stmt = select(Relationship).where(Relationship.contact_id.in_(frontier))
        relationships = session.exec(rels_stmt).all()

        for rel in relationships:
            target_id = rel.related_contact_id
            if target_id not in visited:
                if target_id in visible_ids:
                    new_frontier.add(target_id)
                    visited.add(target_id)

        inv_rels_stmt = select(Relationship).where(
            Relationship.related_contact_id.in_(frontier)
        )
        inv_relationships = session.exec(inv_rels_stmt).all()

        for rel in inv_relationships:
            source_id = rel.contact_id
            if source_id not in visited:
                if source_id in visible_ids:
                    new_frontier.add(source_id)
                    visited.add(source_id)

        frontier = new_frontier
        current_depth += 1

    # Also include direct relationships for visited nodes
    all_contact_ids = visited | {root_id}

    contacts_stmt = select(Contact).where(Contact.id.in_(all_contact_ids))
    contacts = session.exec(contacts_stmt).all()

    nodes = []
    for c in contacts:
        name_parts = [c.first_name, c.last_name]
        label = " ".join([p for p in name_parts if p]) or "(unnamed)"
        nodes.append(
            {
                "id": str(c.id),
                "label": label,
                "avatar_url": c.avatar_url,
                "company": c.company,
                "is_favorite": c.is_favorite,
            }
        )

    edges_stmt = select(Relationship).where(
        Relationship.contact_id.in_(all_contact_ids),
        Relationship.related_contact_id.in_(all_contact_ids),
    )
    relationships = session.exec(edges_stmt).all()

    edges = []
    seen_pairs = set()
    for rel in relationships:
        pair_key = tuple(sorted([str(rel.contact_id), str(rel.related_contact_id)]))
        if pair_key in seen_pairs:
            continue
        seen_pairs.add(pair_key)
        edges.append(
            {
                "source": str(rel.contact_id),
                "target": str(rel.related_contact_id),
                "label": rel.relationship_type,
            }
        )

    return {"nodes": nodes, "edges": edges}


@router.get("/contacts")
def get_contacts_graph(
    session: SessionDep,
    current_user: CurrentUser,
    depth: int = Query(
        default=2, ge=1, le=3, description="Hops from seed contacts (1-3)"
    ),
    root_contact_id: uuid.UUID | None = Query(
        default=None, description="Optional root contact to focus on"
    ),
) -> Any:
    """Return contacts + relationships as a graph (nodes + edges)."""
    visible_ids = set(
        session.exec(
            select(Contact.id).where(Contact.id.in_(visible_contact_ids(current_user)))
        ).all()
    )

    if not visible_ids:
        return {"nodes": [], "edges": []}

    if root_contact_id:
        if root_contact_id not in visible_ids:
            return {"nodes": [], "edges": []}
        return _build_graph_for_root(session, visible_ids, root_contact_id, depth)

    return _build_graph(session, current_user, depth)


@router.get("/contacts/{contact_id}")
def get_contact_graph(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    depth: int = Query(
        default=2, ge=1, le=3, description="Hops from the contact (1-3)"
    ),
) -> Any:
    """Return the neighborhood graph for a specific contact."""
    visible_ids = set(
        session.exec(
            select(Contact.id).where(Contact.id.in_(visible_contact_ids(current_user)))
        ).all()
    )

    if contact_id not in visible_ids:
        raise HTTPException(status_code=404, detail="Contact not found")

    return _build_graph_for_root(session, visible_ids, contact_id, depth)

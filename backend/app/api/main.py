from fastapi import APIRouter

from app.api.routes import (
    activity_logs,
    addresses,
    calendar,
    contact_fields,
    contacts,
    contacts_kanban,
    custom_fields,
    debts,
    gifts,
    groups,
    import_export,
    interactions,
    journal,
    life_events,
    login,
    media_recommendations,
    notes,
    pets,
    private,
    relationships,
    reminders,
    tag_shares,
    tags,
    users,
    utils,
    webhooks,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)

# CRM routes
api_router.include_router(contacts.router)
api_router.include_router(tags.router)
api_router.include_router(tag_shares.router)
api_router.include_router(groups.router)
api_router.include_router(contact_fields.router)
api_router.include_router(addresses.router)
api_router.include_router(relationships.router)
api_router.include_router(pets.router)
api_router.include_router(custom_fields.router)
api_router.include_router(interactions.router)
api_router.include_router(reminders.router)
api_router.include_router(gifts.router)
api_router.include_router(debts.router)
api_router.include_router(life_events.router)
api_router.include_router(notes.router)
api_router.include_router(media_recommendations.router)
api_router.include_router(journal.router)
api_router.include_router(import_export.router)
api_router.include_router(webhooks.router)
api_router.include_router(activity_logs.router)
api_router.include_router(calendar.router)
api_router.include_router(contacts_kanban.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)

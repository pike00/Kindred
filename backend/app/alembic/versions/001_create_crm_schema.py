"""Create initial CRM schema with all contact management tables.

Revision ID: 001_create_crm_schema
Revises: fe56fa70289e
Create Date: 2026-03-29 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "001_create_crm_schema"
down_revision = "fe56fa70289e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all CRM tables."""

    # Tag table
    op.create_table(
        "tag",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tag_owner_id"), "tag", ["owner_id"], unique=False)

    # Group table
    op.create_table(
        "group",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_group_owner_id"), "group", ["owner_id"], unique=False)

    # Contact table
    op.create_table(
        "contact",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(length=255), nullable=False),
        sa.Column("last_name", sa.String(length=255), nullable=True),
        sa.Column("middle_name", sa.String(length=255), nullable=True),
        sa.Column("prefix", sa.String(length=50), nullable=True),
        sa.Column("suffix", sa.String(length=50), nullable=True),
        sa.Column("nickname", sa.String(length=255), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("department", sa.String(length=255), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("birthday", sa.Date(), nullable=True),
        sa.Column("notes", sa.String(length=10000), nullable=True),
        sa.Column("how_we_met", sa.String(length=2000), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("is_deceased", sa.Boolean(), nullable=False),
        sa.Column("deceased_at", sa.Date(), nullable=True),
        sa.Column("contact_frequency_days", sa.Integer(), nullable=True),
        sa.Column("stage", sa.String(length=100), nullable=True),
        sa.Column("vcard_raw", sa.String(), nullable=True),
        sa.Column("vcard_etag", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
        sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_contact_is_archived"), "contact", ["is_archived"], unique=False)
    op.create_index(op.f("ix_contact_is_favorite"), "contact", ["is_favorite"], unique=False)
    op.create_index(op.f("ix_contact_owner_id"), "contact", ["owner_id"], unique=False)
    op.create_index(
        op.f("ix_contact_contact_frequency_days"),
        "contact",
        ["contact_frequency_days"],
        unique=False,
    )

    # ContactTag junction table
    op.create_table(
        "contact_tag",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tag.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("contact_id", "tag_id"),
    )

    # ContactGroup junction table
    op.create_table(
        "contact_group",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["group.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("contact_id", "group_id"),
    )

    # ContactField table
    op.create_table(
        "contact_field",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "field_type",
            sa.Enum(
                "EMAIL", "PHONE", "URL", "SOCIAL", "IM", "CUSTOM", name="contactfieldtype"
            ),
            nullable=False,
        ),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=2048), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_contact_field_contact_id"), "contact_field", ["contact_id"], unique=False)
    op.create_index(op.f("ix_contact_field_field_type"), "contact_field", ["field_type"], unique=False)

    # Address table
    op.create_table(
        "address",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("street", sa.String(length=500), nullable=True),
        sa.Column("extended", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=255), nullable=True),
        sa.Column("region", sa.String(length=255), nullable=True),
        sa.Column("postal_code", sa.String(length=50), nullable=True),
        sa.Column("country", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_address_contact_id"), "address", ["contact_id"], unique=False)

    # Relationship table
    op.create_table(
        "relationship",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("related_contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relationship_type", sa.String(length=100), nullable=False),
        sa.Column(
            "relationship_group",
            sa.Enum("FAMILY", "ROMANTIC", "FRIEND", "WORK", "OTHER", name="relationshipgroup"),
            nullable=False,
        ),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_relationship_contact_id"), "relationship", ["contact_id"], unique=False)
    op.create_index(
        op.f("ix_relationship_related_contact_id"),
        "relationship",
        ["related_contact_id"],
        unique=False,
    )

    # Pet table
    op.create_table(
        "pet",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("species", sa.String(length=100), nullable=True),
        sa.Column("breed", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pet_contact_id"), "pet", ["contact_id"], unique=False)

    # CustomFieldDefinition table
    op.create_table(
        "custom_field_definition",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("field_type", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("options", sa.String(length=2000), nullable=True),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_custom_field_definition_owner_id"),
        "custom_field_definition",
        ["owner_id"],
        unique=False,
    )

    # CustomFieldValue table
    op.create_table(
        "custom_field_value",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_definition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("value", sa.String(length=5000), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_definition_id"], ["custom_field_definition.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_custom_field_value_contact_id"), "custom_field_value", ["contact_id"], unique=False
    )
    op.create_index(
        op.f("ix_custom_field_value_field_definition_id"),
        "custom_field_value",
        ["field_definition_id"],
        unique=False,
    )

    # Interaction table
    op.create_table(
        "interaction",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "channel",
            sa.Enum(
                "CALL", "IN_PERSON", "TEXT", "EMAIL", "VIDEO", "SOCIAL", "OTHER",
                name="interactionchannel",
            ),
            nullable=False,
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.String(length=10000), nullable=True),
        sa.Column("mood", sa.String(length=50), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_interaction_contact_id"), "interaction", ["contact_id"], unique=False)
    op.create_index(op.f("ix_interaction_owner_id"), "interaction", ["owner_id"], unique=False)
    op.create_index(op.f("ix_interaction_occurred_at"), "interaction", ["occurred_at"], unique=False)
    op.create_index(op.f("ix_interaction_channel"), "interaction", ["channel"], unique=False)

    # Reminder table
    op.create_table(
        "reminder",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("remind_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "frequency",
            sa.Enum("ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", name="reminderfrequency"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reminder_owner_id"), "reminder", ["owner_id"], unique=False)
    op.create_index(op.f("ix_reminder_contact_id"), "reminder", ["contact_id"], unique=False)
    op.create_index(op.f("ix_reminder_remind_at"), "reminder", ["remind_at"], unique=False)
    op.create_index(op.f("ix_reminder_is_active"), "reminder", ["is_active"], unique=False)

    # Gift table
    op.create_table(
        "gift",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("status", sa.Enum("IDEA", "GIVEN", "RECEIVED", name="giftstatus"), nullable=False),
        sa.Column("occasion", sa.String(length=255), nullable=True),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("value_amount", sa.Float(), nullable=True),
        sa.Column("value_currency", sa.String(length=3), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_gift_contact_id"), "gift", ["contact_id"], unique=False)
    op.create_index(op.f("ix_gift_owner_id"), "gift", ["owner_id"], unique=False)
    op.create_index(op.f("ix_gift_status"), "gift", ["status"], unique=False)

    # Debt table
    op.create_table(
        "debt",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("direction", sa.Enum("I_OWE", "THEY_OWE", name="debtdirection"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("reason", sa.String(length=1000), nullable=True),
        sa.Column("is_settled", sa.Boolean(), nullable=False),
        sa.Column("settled_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_debt_contact_id"), "debt", ["contact_id"], unique=False)
    op.create_index(op.f("ix_debt_owner_id"), "debt", ["owner_id"], unique=False)
    op.create_index(op.f("ix_debt_is_settled"), "debt", ["is_settled"], unique=False)

    # LifeEvent table
    op.create_table(
        "life_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("occurred_at", sa.Date(), nullable=False),
        sa.Column("create_annual_reminder", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_life_event_contact_id"), "life_event", ["contact_id"], unique=False)
    op.create_index(op.f("ix_life_event_owner_id"), "life_event", ["owner_id"], unique=False)
    op.create_index(op.f("ix_life_event_occurred_at"), "life_event", ["occurred_at"], unique=False)

    # Note table
    op.create_table(
        "note",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("body", sa.String(length=50000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_note_contact_id"), "note", ["contact_id"], unique=False)
    op.create_index(op.f("ix_note_owner_id"), "note", ["owner_id"], unique=False)
    op.create_index(op.f("ix_note_created_at"), "note", ["created_at"], unique=False)

    # JournalEntry table
    op.create_table(
        "journal_entry",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("body", sa.String(length=50000), nullable=False),
        sa.Column("mood", sa.String(length=50), nullable=True),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_journal_entry_owner_id"), "journal_entry", ["owner_id"], unique=False)
    op.create_index(op.f("ix_journal_entry_entry_date"), "journal_entry", ["entry_date"], unique=False)

    # WebhookEndpoint table
    op.create_table(
        "webhook_endpoint",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("direction", sa.String(length=10), nullable=False),
        sa.Column("event_types", sa.String(length=1000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("secret", sa.String(length=255), nullable=True),
        sa.Column("api_key", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_webhook_endpoint_owner_id"), "webhook_endpoint", ["owner_id"], unique=False)
    op.create_index(op.f("ix_webhook_endpoint_direction"), "webhook_endpoint", ["direction"], unique=False)


def downgrade() -> None:
    """Drop all CRM tables."""
    op.drop_index(op.f("ix_webhook_endpoint_direction"), table_name="webhook_endpoint")
    op.drop_index(op.f("ix_webhook_endpoint_owner_id"), table_name="webhook_endpoint")
    op.drop_table("webhook_endpoint")
    op.drop_index(op.f("ix_journal_entry_entry_date"), table_name="journal_entry")
    op.drop_index(op.f("ix_journal_entry_owner_id"), table_name="journal_entry")
    op.drop_table("journal_entry")
    op.drop_index(op.f("ix_note_created_at"), table_name="note")
    op.drop_index(op.f("ix_note_owner_id"), table_name="note")
    op.drop_index(op.f("ix_note_contact_id"), table_name="note")
    op.drop_table("note")
    op.drop_index(op.f("ix_life_event_occurred_at"), table_name="life_event")
    op.drop_index(op.f("ix_life_event_owner_id"), table_name="life_event")
    op.drop_index(op.f("ix_life_event_contact_id"), table_name="life_event")
    op.drop_table("life_event")
    op.drop_index(op.f("ix_debt_is_settled"), table_name="debt")
    op.drop_index(op.f("ix_debt_owner_id"), table_name="debt")
    op.drop_index(op.f("ix_debt_contact_id"), table_name="debt")
    op.drop_table("debt")
    op.drop_index(op.f("ix_gift_status"), table_name="gift")
    op.drop_index(op.f("ix_gift_owner_id"), table_name="gift")
    op.drop_index(op.f("ix_gift_contact_id"), table_name="gift")
    op.drop_table("gift")
    op.drop_index(op.f("ix_reminder_is_active"), table_name="reminder")
    op.drop_index(op.f("ix_reminder_remind_at"), table_name="reminder")
    op.drop_index(op.f("ix_reminder_contact_id"), table_name="reminder")
    op.drop_index(op.f("ix_reminder_owner_id"), table_name="reminder")
    op.drop_table("reminder")
    op.drop_index(op.f("ix_interaction_channel"), table_name="interaction")
    op.drop_index(op.f("ix_interaction_occurred_at"), table_name="interaction")
    op.drop_index(op.f("ix_interaction_owner_id"), table_name="interaction")
    op.drop_index(op.f("ix_interaction_contact_id"), table_name="interaction")
    op.drop_table("interaction")
    op.drop_index(
        op.f("ix_custom_field_value_field_definition_id"), table_name="custom_field_value"
    )
    op.drop_index(op.f("ix_custom_field_value_contact_id"), table_name="custom_field_value")
    op.drop_table("custom_field_value")
    op.drop_index(
        op.f("ix_custom_field_definition_owner_id"), table_name="custom_field_definition"
    )
    op.drop_table("custom_field_definition")
    op.drop_index(op.f("ix_pet_contact_id"), table_name="pet")
    op.drop_table("pet")
    op.drop_index(op.f("ix_relationship_related_contact_id"), table_name="relationship")
    op.drop_index(op.f("ix_relationship_contact_id"), table_name="relationship")
    op.drop_table("relationship")
    op.drop_index(op.f("ix_address_contact_id"), table_name="address")
    op.drop_table("address")
    op.drop_index(op.f("ix_contact_field_field_type"), table_name="contact_field")
    op.drop_index(op.f("ix_contact_field_contact_id"), table_name="contact_field")
    op.drop_table("contact_field")
    op.drop_table("contact_group")
    op.drop_table("contact_tag")
    op.drop_index(
        op.f("ix_contact_contact_frequency_days"), table_name="contact"
    )
    op.drop_index(op.f("ix_contact_owner_id"), table_name="contact")
    op.drop_index(op.f("ix_contact_is_favorite"), table_name="contact")
    op.drop_index(op.f("ix_contact_is_archived"), table_name="contact")
    op.drop_table("contact")
    op.drop_index(op.f("ix_group_owner_id"), table_name="group")
    op.drop_table("group")
    op.drop_index(op.f("ix_tag_owner_id"), table_name="tag")
    op.drop_table("tag")

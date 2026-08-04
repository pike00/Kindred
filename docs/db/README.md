# crm

## Tables

| Name | Columns | Comment | Type |
| ---- | ------- | ------- | ---- |
| [public.alembic_version](public.alembic_version.md) | 1 |  | BASE TABLE |
| [public.user](public.user.md) | 9 | Authenticated user; tenant-scope owner of every row below. | BASE TABLE |
| [public.tag](public.tag.md) | 6 | User-defined tag for grouping contacts. | BASE TABLE |
| [public.contact](public.contact.md) | 41 | Core contact entity — the subject of everything else in the CRM. | BASE TABLE |
| [public.contact_tag](public.contact_tag.md) | 2 | Many-to-many link between contacts and tags. | BASE TABLE |
| [public.contact_field](public.contact_field.md) | 7 | Flexible contact info (emails, phones) attached to a contact. | BASE TABLE |
| [public.address](public.address.md) | 11 | Physical address attached to a contact. | BASE TABLE |
| [public.relationship](public.relationship.md) | 6 | Directional link between two contacts (spouse, child, friend, etc.). | BASE TABLE |
| [public.pet](public.pet.md) | 6 | Pet owned by a contact; useful for memorable conversation hooks. | BASE TABLE |
| [public.custom_field_definition](public.custom_field_definition.md) | 8 | User-defined custom field schema, scoped to one owner. | BASE TABLE |
| [public.custom_field_value](public.custom_field_value.md) | 4 | Value of a custom field for a specific contact (one per contact per definition). | BASE TABLE |
| [public.interaction](public.interaction.md) | 19 | Logged touchpoint with one or more contacts (call, meeting, text, etc.). Attendees are attached via interaction_attendee. | BASE TABLE |
| [public.reminder](public.reminder.md) | 12 | Scheduled reminder; contact-specific or standalone. | BASE TABLE |
| [public.gift](public.gift.md) | 13 | Gift idea or record for a contact. | BASE TABLE |
| [public.debt](public.debt.md) | 11 | Money owed to or from a contact. | BASE TABLE |
| [public.life_event](public.life_event.md) | 10 | Milestone on a contact's timeline (job change, wedding, move, etc.). | BASE TABLE |
| [public.note](public.note.md) | 9 | Timestamped freeform note attached to a specific contact. | BASE TABLE |
| [public.webhook_endpoint](public.webhook_endpoint.md) | 10 | Inbound or outbound webhook configuration. | BASE TABLE |
| [public.tag_share](public.tag_share.md) | 3 | Grants another user read access to all rows bearing a given tag. | BASE TABLE |
| [public.media_recommendation](public.media_recommendation.md) | 10 | Media (book, show, podcast, etc.) recommended to or by a contact. | BASE TABLE |
| [public.interaction_attendee](public.interaction_attendee.md) | 2 | Many-to-many link between interactions and contacts (attendees). | BASE TABLE |
| [public.activity_log](public.activity_log.md) | 9 |  | BASE TABLE |
| [public.note_mention](public.note_mention.md) | 2 |  | BASE TABLE |
| [public.api_key](public.api_key.md) | 9 |  | BASE TABLE |
| [public.api_key_impersonate](public.api_key_impersonate.md) | 2 |  | BASE TABLE |
| [public.organization](public.organization.md) | 17 |  | BASE TABLE |
| [public.reminder_snooze](public.reminder_snooze.md) | 6 |  | BASE TABLE |
| [public.contact_merge](public.contact_merge.md) | 6 |  | BASE TABLE |
| [public.inverse_relationship_map](public.inverse_relationship_map.md) | 5 |  | BASE TABLE |
| [public.debt_payment](public.debt_payment.md) | 6 |  | BASE TABLE |
| [public.communication_preference](public.communication_preference.md) | 8 |  | BASE TABLE |
| [public.setup_state](public.setup_state.md) | 3 |  | BASE TABLE |
| [public.ical_import_log](public.ical_import_log.md) | 6 |  | BASE TABLE |
| [public.calendar_token](public.calendar_token.md) | 8 |  | BASE TABLE |
| [public.contact_stage_event](public.contact_stage_event.md) | 8 |  | BASE TABLE |
| [public.email_oauth_token](public.email_oauth_token.md) | 10 |  | BASE TABLE |
| [public.saved_filter](public.saved_filter.md) | 7 |  | BASE TABLE |
| [public.vcard_conflict](public.vcard_conflict.md) | 8 |  | BASE TABLE |
| [public.all_contacts_share](public.all_contacts_share.md) | 3 | Grants another user access to all current and future contacts by owner. | BASE TABLE |

## Stored procedures and functions

| Name | ReturnType | Arguments | Type |
| ---- | ------- | ------- | ---- |
| public.uuid_nil | uuid |  | FUNCTION |
| public.uuid_ns_dns | uuid |  | FUNCTION |
| public.uuid_ns_url | uuid |  | FUNCTION |
| public.uuid_ns_oid | uuid |  | FUNCTION |
| public.uuid_ns_x500 | uuid |  | FUNCTION |
| public.uuid_generate_v1 | uuid |  | FUNCTION |
| public.uuid_generate_v1mc | uuid |  | FUNCTION |
| public.uuid_generate_v3 | uuid | namespace uuid, name text | FUNCTION |
| public.uuid_generate_v4 | uuid |  | FUNCTION |
| public.uuid_generate_v5 | uuid | namespace uuid, name text | FUNCTION |
| public.update_contact_search_vector | trigger |  | FUNCTION |
| public.update_note_search_vector | trigger |  | FUNCTION |
| public.update_interaction_search_vector | trigger |  | FUNCTION |

## Enums

| Name | Values |
| ---- | ------- |
| public.contactfieldtype | EMAIL, PHONE |
| public.contactsource | CARDDAV, GOOGLE, MANUAL, VCARD_IMPORT, WEBHOOK |
| public.debtdirection | I_OWE, THEY_OWE |
| public.giftstatus | GIVEN, IDEA, PURCHASED, RECEIVED, WRAPPED |
| public.interactionchannel | CALL, EMAIL, IN_PERSON, OTHER, RECOMMENDATION, SKIP, SOCIAL, TEXT, VIDEO, recommendation |
| public.mediacategory | BOOK, MOVIE, MUSICIAN, OTHER, PODCAST, TV_SHOW |
| public.reminderfrequency | DAILY, MONTHLY, ONCE, WEEKLY, YEARLY |

## Relations

```mermaid
erDiagram

"public.tag" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.contact" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.contact" }o--o| "public.organization" : "FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL"
"public.contact_tag" }o--|| "public.tag" : "FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE"
"public.contact_tag" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.contact_field" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.address" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.relationship" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.relationship" }o--|| "public.contact" : "FOREIGN KEY (related_contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.relationship" }o--o| "public.relationship" : "FOREIGN KEY (inverse_id) REFERENCES relationship(id) ON DELETE SET NULL"
"public.pet" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.custom_field_definition" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.custom_field_value" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.custom_field_value" }o--|| "public.custom_field_definition" : "FOREIGN KEY (field_definition_id) REFERENCES custom_field_definition(id) ON DELETE CASCADE"
"public.interaction" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.reminder" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.reminder" }o--o| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.gift" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.gift" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.debt" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.debt" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.life_event" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.life_event" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.note" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.note" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.webhook_endpoint" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.tag_share" }o--|| "public.user" : "FOREIGN KEY (grantee_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.tag_share" }o--|| "public.tag" : "FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE"
"public.media_recommendation" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.media_recommendation" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.interaction_attendee" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.interaction_attendee" }o--|| "public.interaction" : "FOREIGN KEY (interaction_id) REFERENCES interaction(id) ON DELETE CASCADE"
"public.activity_log" }o--o| "public.user" : "FOREIGN KEY (actor_id) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.activity_log" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.activity_log" }o--o| "public.api_key" : "FOREIGN KEY (acting_api_key_id) REFERENCES api_key(id) ON DELETE SET NULL"
"public.note_mention" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.note_mention" }o--|| "public.note" : "FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE"
"public.api_key" }o--|| "public.user" : "FOREIGN KEY (owned_by_user_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.api_key_impersonate" }o--|| "public.user" : "FOREIGN KEY (user_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.api_key_impersonate" }o--|| "public.api_key" : "FOREIGN KEY (api_key_id) REFERENCES api_key(id) ON DELETE CASCADE"
"public.organization" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.reminder_snooze" }o--|| "public.reminder" : "FOREIGN KEY (reminder_id) REFERENCES reminder(id) ON DELETE CASCADE"
"public.contact_merge" }o--o| "public.user" : "FOREIGN KEY (merged_by) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.contact_merge" }o--|| "public.contact" : "FOREIGN KEY (absorbed_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.contact_merge" }o--|| "public.contact" : "FOREIGN KEY (surviving_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.debt_payment" }o--|| "public.debt" : "FOREIGN KEY (debt_id) REFERENCES debt(id) ON DELETE CASCADE"
"public.communication_preference" |o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.ical_import_log" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.ical_import_log" }o--o| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.calendar_token" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.contact_stage_event" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.contact_stage_event" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.email_oauth_token" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.email_oauth_token" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.saved_filter" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.saved_filter" }o--o| "public.tag" : "FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE SET NULL"
"public.vcard_conflict" }o--|| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"
"public.all_contacts_share" }o--|| "public.user" : "FOREIGN KEY (grantee_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.all_contacts_share" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"

"public.alembic_version" {
  varchar_32_ version_num
}
"public.user" {
  varchar_255_ email
  boolean is_active
  boolean is_superuser
  varchar_255_ full_name
  varchar hashed_password
  uuid id
  timestamp_with_time_zone created_at
  varchar_512_ oidc_iss
  varchar_255_ oidc_sub
}
"public.tag" {
  uuid id
  uuid owner_id FK
  varchar_100_ name
  varchar_7_ color
  timestamp_with_time_zone created_at
  varchar_1000_ description
}
"public.contact" {
  uuid id
  uuid owner_id FK
  varchar_255_ first_name
  varchar_255_ last_name
  varchar_255_ middle_name
  varchar_50_ prefix
  varchar_50_ suffix
  varchar_255_ nickname
  varchar_255_ company
  varchar_255_ department
  varchar_255_ title
  date birthday
  varchar_2000_ how_we_met
  boolean is_favorite
  boolean is_archived
  boolean is_deceased
  date deceased_at
  integer contact_frequency_days
  varchar_100_ stage
  varchar vcard_raw
  varchar_255_ vcard_etag
  varchar_2048_ avatar_url
  timestamp_with_time_zone last_contacted_at
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  timestamp_with_time_zone deleted_at
  contactsource source
  varchar_500_ source_external_id
  uuid organization_id FK
  boolean do_not_contact
  varchar_500_ do_not_contact_reason
  varchar_64_ vcard_sha256
  varchar_500_ imessage_id
  timestamp_with_time_zone imessage_synced_at
  varchar_64_ imessage_profile_hash
  jsonb imessage_profile
  boolean is_merged
  varchar_255_ timezone
  text pronouns
  tsvector search_vector
  boolean auto_log_email
}
"public.contact_tag" {
  uuid contact_id FK
  uuid tag_id FK
}
"public.contact_field" {
  uuid id
  uuid contact_id FK
  contactfieldtype field_type
  varchar_100_ label
  varchar_2048_ value
  boolean is_primary
  integer sort_order
}
"public.address" {
  uuid id
  uuid contact_id FK
  varchar_100_ label
  varchar_500_ street
  varchar_500_ extended
  varchar_255_ city
  varchar_255_ region
  varchar_50_ postal_code
  varchar_255_ country
  double_precision latitude
  double_precision longitude
}
"public.relationship" {
  uuid id
  uuid contact_id FK
  uuid related_contact_id FK
  varchar_100_ relationship_type
  varchar_1000_ notes
  uuid inverse_id FK
}
"public.pet" {
  uuid id
  uuid contact_id FK
  varchar_255_ name
  varchar_100_ species
  varchar_100_ breed
  varchar_1000_ notes
}
"public.custom_field_definition" {
  uuid id
  uuid owner_id FK
  varchar_255_ name
  varchar_50_ field_type
  varchar_500_ description
  varchar_2000_ options
  varchar_50_ icon
  timestamp_with_time_zone created_at
}
"public.custom_field_value" {
  uuid id
  uuid contact_id FK
  uuid field_definition_id FK
  varchar_5000_ value
}
"public.interaction" {
  uuid id
  uuid owner_id FK
  interactionchannel channel
  timestamp_with_time_zone occurred_at
  varchar_10000_ notes
  integer duration_minutes
  timestamp_with_time_zone created_at
  timestamp_without_time_zone deleted_at
  boolean is_draft
  varchar_32_ draft_source
  varchar_500_ location_label
  double_precision latitude
  double_precision longitude
  tsvector search_vector
  varchar_998_ message_id
  varchar_998_ email_subject
  varchar_2048_ email_from
  varchar_2048_ email_to
  timestamp_without_time_zone email_date
}
"public.reminder" {
  uuid id
  uuid owner_id FK
  uuid contact_id FK
  varchar_500_ title
  varchar_2000_ description
  timestamp_with_time_zone remind_at
  reminderfrequency frequency
  boolean is_active
  timestamp_with_time_zone last_sent_at
  timestamp_with_time_zone snoozed_until
  timestamp_with_time_zone created_at
  timestamp_without_time_zone deleted_at
}
"public.gift" {
  uuid id
  uuid owner_id FK
  uuid contact_id FK
  varchar_500_ name
  varchar_2000_ description
  giftstatus status
  varchar_255_ occasion
  date date
  double_precision value_amount
  varchar_3_ value_currency
  varchar_2048_ url
  timestamp_with_time_zone created_at
  timestamp_without_time_zone deleted_at
}
"public.debt" {
  uuid id
  uuid owner_id FK
  uuid contact_id FK
  debtdirection direction
  double_precision amount
  varchar_3_ currency
  varchar_1000_ reason
  boolean is_settled
  date settled_at
  timestamp_with_time_zone created_at
  timestamp_without_time_zone deleted_at
}
"public.life_event" {
  uuid id
  uuid owner_id FK
  uuid contact_id FK
  varchar_100_ event_type
  varchar_500_ title
  varchar_2000_ description
  date occurred_at
  boolean create_annual_reminder
  timestamp_with_time_zone created_at
  timestamp_without_time_zone deleted_at
}
"public.note" {
  uuid id
  uuid owner_id FK
  uuid contact_id FK
  varchar_50000_ body
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  timestamp_without_time_zone deleted_at
  varchar_36_ client_id
  tsvector search_vector
}
"public.webhook_endpoint" {
  uuid id
  uuid owner_id FK
  varchar_255_ name
  varchar_2048_ url
  varchar_10_ direction
  varchar_1000_ event_types
  boolean is_active
  varchar_255_ secret
  varchar_255_ api_key
  timestamp_with_time_zone created_at
}
"public.tag_share" {
  uuid tag_id FK
  uuid grantee_id FK
  timestamp_with_time_zone created_at
}
"public.media_recommendation" {
  uuid id
  uuid owner_id FK
  uuid contact_id FK
  mediacategory category
  varchar_500_ title
  varchar_500_ creator
  varchar_5000_ note
  date recommended_at
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
"public.interaction_attendee" {
  uuid interaction_id FK
  uuid contact_id FK
}
"public.activity_log" {
  uuid id
  uuid owner_id FK
  uuid actor_id FK
  varchar_64_ entity_type
  uuid entity_id
  varchar_32_ action
  jsonb changes_json
  timestamp_with_time_zone occurred_at
  uuid acting_api_key_id FK
}
"public.note_mention" {
  uuid note_id FK
  uuid contact_id FK
}
"public.api_key" {
  uuid id
  varchar_255_ name
  varchar_64_ key_hash
  varchar_16_ key_prefix
  uuid owned_by_user_id FK
  timestamp_with_time_zone created_at
  timestamp_with_time_zone last_used_at
  timestamp_with_time_zone revoked_at
  timestamp_with_time_zone expires_at
}
"public.api_key_impersonate" {
  uuid api_key_id FK
  uuid user_id FK
}
"public.organization" {
  varchar_255_ name
  varchar_255_ domain
  varchar_255_ industry
  varchar_2000_ notes
  varchar_100_ address_label
  varchar_500_ address_street
  varchar_500_ address_extended
  varchar_255_ address_city
  varchar_255_ address_region
  varchar_50_ address_postal_code
  varchar_255_ address_country
  double_precision address_latitude
  double_precision address_longitude
  uuid id
  uuid owner_id FK
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
"public.reminder_snooze" {
  uuid id
  uuid reminder_id FK
  timestamp_with_time_zone snoozed_at
  timestamp_with_time_zone snoozed_until
  text reason
  timestamp_with_time_zone created_at
}
"public.contact_merge" {
  uuid id
  uuid surviving_id FK
  uuid absorbed_id FK
  uuid merged_by FK
  timestamp_with_time_zone merged_at
  varchar_1000_ notes
}
"public.inverse_relationship_map" {
  uuid id
  varchar_100_ relationship_type
  varchar_100_ inverse_type
  boolean is_symmetric
  timestamp_with_time_zone created_at
}
"public.debt_payment" {
  uuid id
  uuid debt_id FK
  numeric_12_2_ amount
  date paid_at
  text note
  timestamp_with_time_zone created_at
}
"public.communication_preference" {
  uuid id
  uuid contact_id FK
  varchar_20_ preferred_channel
  varchar_11_ best_time_local
  boolean do_not_contact
  varchar_500_ do_not_contact_reason
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
"public.setup_state" {
  integer id
  boolean complete
  varchar_128_ token_hash
}
"public.ical_import_log" {
  uuid id
  uuid owner_id FK
  varchar_2048_ uid
  uuid contact_id FK
  varchar_50_ event_type
  timestamp_with_time_zone imported_at
}
"public.calendar_token" {
  uuid id
  uuid owner_id FK
  varchar_255_ token
  varchar_20_ status
  timestamp_with_time_zone expires_at
  timestamp_with_time_zone last_used_at
  timestamp_with_time_zone revoked_at
  timestamp_with_time_zone created_at
}
"public.contact_stage_event" {
  uuid id
  uuid contact_id FK
  uuid owner_id FK
  varchar_100_ from_stage
  varchar_100_ to_stage
  timestamp_with_time_zone occurred_at
  varchar_2000_ note
  timestamp_with_time_zone created_at
}
"public.email_oauth_token" {
  uuid id
  uuid owner_id FK
  uuid contact_id FK
  varchar_50_ provider
  varchar_255_ email_address
  text encrypted_access_token
  text encrypted_refresh_token
  timestamp_with_time_zone token_expires_at
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
"public.saved_filter" {
  uuid id
  varchar_255_ name
  jsonb filter_json
  uuid tag_id FK
  uuid owner_id FK
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
"public.vcard_conflict" {
  uuid id
  uuid contact_id FK
  text incoming_vcard_raw
  varchar_64_ incoming_hash
  varchar_64_ local_hash
  timestamp_with_time_zone resolved_at
  varchar_50_ resolution_type
  timestamp_with_time_zone created_at
}
"public.all_contacts_share" {
  uuid owner_id FK
  uuid grantee_id FK
  timestamp_with_time_zone created_at
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)

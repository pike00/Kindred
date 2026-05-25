# public.reminder

## Description

Scheduled reminder; contact-specific or standalone.

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | uuid |  | false | [public.reminder_snooze](public.reminder_snooze.md) |  | Primary key. |
| owner_id | uuid |  | false |  | [public.user](public.user.md) | Owner user; cascades on delete. |
| contact_id | uuid |  | true |  | [public.contact](public.contact.md) | Optional contact; null for standalone reminders. |
| title | varchar(500) |  | false |  |  | Reminder title. |
| description | varchar(2000) |  | true |  |  | Extra details shown with the reminder. |
| remind_at | timestamp with time zone |  | false |  |  | When to fire the reminder. |
| frequency | reminderfrequency |  | false |  |  | How often the reminder repeats. |
| is_active | boolean |  | false |  |  | Enable or disable without deleting. |
| last_sent_at | timestamp with time zone |  | true |  |  | When the ARQ worker last fired this reminder. |
| snoozed_until | timestamp with time zone |  | true |  |  | If set, suppress firing until this time. |
| created_at | timestamp with time zone |  | false |  |  | When the reminder was created (UTC). |
| deleted_at | timestamp without time zone |  | true |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| reminder_created_at_not_null | n | NOT NULL created_at |
| reminder_frequency_not_null | n | NOT NULL frequency |
| reminder_id_not_null | n | NOT NULL id |
| reminder_is_active_not_null | n | NOT NULL is_active |
| reminder_owner_id_not_null | n | NOT NULL owner_id |
| reminder_remind_at_not_null | n | NOT NULL remind_at |
| reminder_title_not_null | n | NOT NULL title |
| reminder_owner_id_fkey | FOREIGN KEY | FOREIGN KEY (owner_id) REFERENCES "user"(id) ON DELETE CASCADE |
| reminder_contact_id_fkey | FOREIGN KEY | FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE |
| reminder_pkey | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| reminder_pkey | CREATE UNIQUE INDEX reminder_pkey ON public.reminder USING btree (id) |
| ix_reminder_owner_id | CREATE INDEX ix_reminder_owner_id ON public.reminder USING btree (owner_id) |
| ix_reminder_contact_id | CREATE INDEX ix_reminder_contact_id ON public.reminder USING btree (contact_id) |
| ix_reminder_remind_at | CREATE INDEX ix_reminder_remind_at ON public.reminder USING btree (remind_at) |
| ix_reminder_is_active | CREATE INDEX ix_reminder_is_active ON public.reminder USING btree (is_active) |
| ix_reminder_deleted_at | CREATE INDEX ix_reminder_deleted_at ON public.reminder USING btree (deleted_at) |

## Relations

```mermaid
erDiagram

"public.reminder_snooze" }o--|| "public.reminder" : "FOREIGN KEY (reminder_id) REFERENCES reminder(id) ON DELETE CASCADE"
"public.reminder" }o--|| "public.user" : "FOREIGN KEY (owner_id) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.reminder" }o--o| "public.contact" : "FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE"

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
"public.reminder_snooze" {
  uuid id
  uuid reminder_id FK
  timestamp_with_time_zone snoozed_at
  timestamp_with_time_zone snoozed_until
  text reason
  timestamp_with_time_zone created_at
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
  uuid organization_id FK
  contactsource source
  varchar_500_ source_external_id
  boolean do_not_contact
  varchar_500_ do_not_contact_reason
  varchar_500_ imessage_id
  timestamp_with_time_zone imessage_synced_at
  varchar_64_ imessage_profile_hash
  jsonb imessage_profile
  tsvector search_vector
  boolean is_merged
  uuid merged_into_id FK
  varchar_64_ vcard_sha256
  varchar_255_ timezone
  text pronouns
  boolean auto_log_email
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)

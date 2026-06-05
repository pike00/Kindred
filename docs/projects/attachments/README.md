---
title: Attachments
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Decide on polymorphism vs per-owner-type tables; finalize blob store choice (Minio/S3/local)
---

# Attachments

## Goal
Add generic attachment support to Contact, Interaction, and Note entities. Store blobs in an object store bucket outside Postgres, keeping only URL and metadata in the database to minimize schema coupling and enable efficient media handling.

## Tasks
- [ ] Decide between single polymorphic `attachment` table or three thin tables (contact_attachment, interaction_attachment, note_attachment)
- [ ] Select blob store: Minio (homelab self-hosted), S3 (AWS), or local disk; document rationale
- [ ] Design attachment schema: id, owner_id, owner_type, owner_id (or three FK columns), mime_type, size_bytes, url, filename, created_at
- [ ] Build upload endpoint: multipart form POST, MIME sniffing, size limit enforcement, presigned URL generation
- [ ] Implement presigned URL generation for secure downloads without exposing direct S3/Minio paths
- [ ] Add React drop zone UI component for contact/interaction/note detail views
- [ ] Create Alembic migration for schema; test collision patterns from personal-crm-alembic-collision-workaround.md
- [ ] Implement orphan cleanup task: when contact/interaction/note is soft-deleted, orphaned blobs expire after 30 days
- [ ] Add thumbnail generation for images (optional: async job via ARQ)
- [ ] Write tests: upload, presigned URL, cascade cleanup, size/MIME validation

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

## Notes

* **Polymorphism choice**: Single table with `owner_type` enum (contact|interaction|note) + `owner_id` UUID is simpler than three tables. Avoids Postgres inheritance complexity and keeps queries unified. Consider whether soft-deletes on owner should mark attachment as orphaned or cascade+delete immediately.

* **Blob store for homelab**: Minio cluster (infra/storage/) is already running; reuse it for attachments to avoid adding a new service. S3 would require AWS credentials management; local disk risks losing blobs if the host volume isn't backed up to external storage.

* **MIME sniffing**: Use `python-magic` (`libmagic` bindings) to detect actual file type regardless of extension. Store detected MIME in DB; reject payloads that don't match declared type or blacklisted types (e.g. .exe, .ps1).

* **Size limits**: Cap uploads at 50 MB per file and 500 MB total per contact/interaction/note. Enforce in FastAPI via `UploadFile` validation; reject oversized batches before writing to Minio.

* **Presigned URLs**: Minio presigned URLs expire after 7 days by default. Frontend requests a presigned URL from the API before downloading; never embed direct S3/Minio URLs in responses (breaks if bucket policy changes or CDN is added later).

* **Soft-delete cascade**: When a contact is soft-deleted (is_archived=true), should attachments be orphaned (marked with is_orphaned=true, expire after 30 days) or immediately deleted? Recommend orphaning to allow undelete during grace period. Clean up orphaned blobs nightly via ARQ background task.

* **Relationship to contact avatar**: Contact.avatar_url currently points to on-disk or external path. Migrating contact avatars to the attachment system is out of scope; treat as separate concern. Attachments are for user-uploaded files on detail views; avatars are pre-loaded metadata.

* **Alembic pattern**: When creating the migration, chain new migrations to uncommitted ones via `depends_on` to avoid revision ID collisions (see personal-crm-alembic-collision-workaround.md). Test locally before merging.

# Share all contacts

This feature lets one owner grant another active Kindred user access to all of the owner's current and future contacts.

Behavior:

- The grant is managed in Settings → Sharing.
- Sharing is read/write, not read-only.
- Current contacts become visible immediately.
- Future contacts created by the owner become visible automatically.
- Shared contact records reuse the normal contact visibility rules, so the grantee can view and edit shared contacts plus contact-scoped records and interactions.
- Interaction visibility is attendee-based: if at least one attendee is visible through the broad share, the interaction is visible. Attendees the grantee cannot otherwise see stay hidden in the attendee list.
- Revoking a grant removes visibility immediately but does not delete contacts, interactions, or the join rows behind them.

Current limitations:

- Only existing active users can be added; there is no invite flow.
- Broad sharing is owner-wide only. There are no per-contact exclusions.
- Tags, groups, journal entries, and other owner-only data remain private.
- Owners can create/list/revoke their grants; grantees cannot manage grants granted to them.
- The feature follows the existing shared-write model. There is no read-only mode yet.

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

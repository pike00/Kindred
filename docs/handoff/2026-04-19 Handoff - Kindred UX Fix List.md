---
summary: "Kindred UX fix list from 'to do and fix -' -- 7/7 code changes in (incl. birthday promotion), uncommitted, unverified in browser"
---

# Handoff: Kindred UX Fix List

**Date:** 2026-04-19
**Goal:** Work through the user's 6-item UX punch list in `docs/handoff/to do and fix -` sequentially. A 7th item (birthday promotion) was added mid-session.

## Current Status

All 7 items have code changes written and pass `tsc --noEmit` (one preexisting Biome error in `AppSidebar.tsx` is unrelated). **Changes are unstaged/uncommitted.** The app was **not** started in a browser this session, so none of this is visually verified.

| # | Item | What I did | File(s) |
|---|------|------------|---------|
| 1 | Loading snappiness | Set QueryClient defaults (`staleTime: 30s`, `gcTime: 5m`, no refetch on focus/reconnect). Removed redundant blocking `loader` on contact detail route — `useSuspenseQuery` was already fetching, loader was pure overhead. | `frontend/src/main.tsx`, `frontend/src/routes/_layout/contacts/$contactId.tsx` |
| 2 | Drop company from front-and-center | Removed `Company` column from contacts table. Removed `company` field + schema key from Add Contact dialog. Company is still editable via Edit Contact dialog and shown on the detail header. | `frontend/src/components/Contacts/columns.tsx`, `frontend/src/components/Contacts/AddContactDialog.tsx` |
| 3 | Interaction log on the right | Moved Interactions into a Card in the right column of the contact detail, with the "Log Interaction" button in the card header. Removed the Interactions tab from the tabbed section; Notes is now the default tab. | `frontend/src/routes/_layout/contacts/$contactId.tsx` |
| 4 | Empty relationships dropdown | In `AddRelationshipDialog`, when there are no other contacts the Select is replaced with "No other contacts yet — add another contact first to create a relationship." | `frontend/src/components/Contacts/RelationshipsCard.tsx` |
| 5 | Group vs tag clarity | Added `InfoHint` (info icon + Tooltip) next to "Tags" and "Groups" card titles on contact detail with explanations. In relationship dialogs, renamed "Group" → "Relationship kind" with its own tooltip explaining it's unrelated to contact Groups/Tags. | `frontend/src/routes/_layout/contacts/$contactId.tsx`, `frontend/src/components/Contacts/RelationshipsCard.tsx` |
| 6 | Buttons instead of dropdowns | Replaced Select with toggleable Button rows for: interaction `channel`, relationship `relationship_group` (Add + Edit dialogs), media `category`. Left Selects in place for large-N lists (related contact picker, contact picker in log-interaction). | `frontend/src/components/Interactions/AddInteractionDialog.tsx`, `frontend/src/components/Contacts/RelationshipsCard.tsx`, `frontend/src/components/MediaRecommendations/AddMediaRecommendation.tsx` |
| 7 | Birthday as core contact field (not life event) | `birthday` is already a first-class column on `ContactBase`; the dropdown duplication was UX noise. Added a `Birthday` date input to Add Contact dialog (optional, empty string → `null`). Removed `"birthday"` from `LifeEventsCard` `EVENT_TYPES`, defaulted the form to `"anniversary"`, and updated the dialog description + empty-state copy. No DB migration needed — user confirmed no existing `life_event` rows of type `birthday`. | `frontend/src/components/Contacts/AddContactDialog.tsx`, `frontend/src/components/Contacts/LifeEventsCard.tsx` |

## Next Steps

1. **Verify in browser.** Spin up the dev stack (`docker compose -f compose.dev.yml up -d --build` or hit the running frontend) and walk through:
   - Contacts list: no Company column, feels snappier on back-navigation
   - Add Contact dialog: no Company field
   - Contact detail: Interactions card on the right with "Log Interaction" button in its header; other tabs (Notes/Gifts/Debts/Media) still work
   - Relationships card: "Add" → opens dialog. With zero other contacts, shows the empty-state message. Otherwise shows the contact picker; "Relationship kind" is a row of buttons.
   - Tooltips: hover the info icons on Tags/Groups card titles and the "Relationship kind" label.
   - Log Interaction: channel is now buttons, not a dropdown.
   - Add Media Recommendation: category is now buttons.
   - Add Contact dialog: Birthday date input is present and optional.
   - Add Life Event dialog: "birthday" is no longer in the Type dropdown; default is now "anniversary".
2. **Commit.** Atomic-ish commits per item would be kinder to review, but a single "ui: Kindred UX fix list from docs/handoff/to do and fix -" is also fine given this is a leaf UI pass.
3. **Decide on "to do and fix -" file.** Either rename it to something conventional (it currently has a trailing space and no extension) or delete it now that items are addressed. It was sitting untracked in `docs/handoff/` which is unusual.
4. **Optional follow-ups the user may still want:**
   - The contact detail page still has `{contact.company && ...}` in the header — user said remove "front and center," not necessarily from the detail header. Confirm before removing.
   - The `relationship_group` button row uses `capitalize` on raw enum values; the single-word enum values render fine but if more groups with underscores are added later, they'll need a label map like `channelLabels`.
   - Loading snappiness has more wins available (route-level prefetch, wiring queryClient into router context via `context: { queryClient }` + `ensureQueryData` in loaders). The current change is the minimum-viable win.

## Key Context

- **Stack:** React + TanStack Router/Query + Vite + Bun + shadcn/ui + Tailwind. Icons go through `@/lib/icons`. Select is the shadcn one; there is no ToggleGroup primitive — I used native Button rows with `variant={selected ? "default" : "outline"}` for toggle behavior.
- **Tag vs Group:** Both are many-to-many contact labels per the backend models (`models.py` ~line 138-248). Tag = name+color only. Group = name+description. I wrote the tooltips to reflect that distinction. Relationship "group" is a separate enum on the Relationship model — nothing to do with contact Groups — hence the rename to "Relationship kind."
- **Why remove the loader on `$contactId.tsx`:** It returned a ContactPublic that was never used by the component (which calls `useSuspenseQuery` instead), so every navigation blocked on a roundtrip whose result was discarded. Component still suspends on first visit; cached visits are instant via the new `staleTime`.
- **Biome note:** Biome auto-reformatted two of my edits (MediaRecommendations and $contactId.tsx). One preexisting Biome format error in `frontend/src/components/Sidebar/AppSidebar.tsx` is untouched by this work — leave it to whoever owns the logo refactor.
- **TodoWrite was not available this session** (deferred tool, would need ToolSearch). Progress was tracked mentally against the 6-item list.

## Files Touched

Modified:
- `frontend/src/main.tsx`
- `frontend/src/routes/_layout/contacts/$contactId.tsx`
- `frontend/src/components/Contacts/columns.tsx`
- `frontend/src/components/Contacts/AddContactDialog.tsx`
- `frontend/src/components/Contacts/RelationshipsCard.tsx`
- `frontend/src/components/Interactions/AddInteractionDialog.tsx`
- `frontend/src/components/MediaRecommendations/AddMediaRecommendation.tsx`

Untouched but referenced:
- `docs/handoff/to do and fix -` — the source punch list
- `backend/app/models.py` — read to understand Tag/Group/RelationshipGroup semantics

## Blockers

None. The remaining risk is that I have **not** visually verified any of this in a running app — see Next Step 1. Type-check and lint are clean aside from the unrelated preexisting AppSidebar formatter warning.

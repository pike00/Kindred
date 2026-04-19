# Frontend style pass — design

Date: 2026-04-18
Scope: visual refresh of the personal-crm frontend (React + shadcn/ui + Tailwind v4 + lucide-react). Iconography unification, warm-neutral palette, dark-mode-correct accent tints, six small shared components that replace ad-hoc patterns repeated across the app, and a rebrand from the FastAPI template residue to **Kindred**.

## Goals

- Clearer iconography across every surface, with one canonical icon per concept.
- Warmer, more cohesive color and surface treatment that adapts cleanly between light and dark mode.
- Replace ~7 inlined patterns (action menus, stat tiles, section headings, empty states) with reusable components.
- No new features; no backend changes; no auth-flow changes.

## Non-goals

- Auth pages (`login.tsx`, `signup.tsx`, `recover-password.tsx`, `reset-password.tsx`).
- Routing or page composition changes.
- Copy / wording (only icons swap; labels stay verbatim).
- Form validation, toasts, error boundaries.
- Favicon, logo, OG image.
- Dependency upgrades beyond removing `react-icons` (only consumer is the Footer, which §6 rewrites).

## 1. Design tokens

### Color (OKLCH, dark-mode pair for each)

Light theme:
- `--background: oklch(0.992 0.003 80)` — warm off-white (~`#fbfaf8`)
- `--foreground: oklch(0.18 0.005 80)`
- `--muted-foreground: oklch(0.50 0.012 80)`
- `--border: oklch(0.92 0.005 80)` — warmer hairline
- `--card: oklch(1 0 0)` — pure white surfaces
- `--primary: oklch(0.58 0.11 128)` — olive/sage green sampled from the Kindred wordmark (replaces the previous teal)
- `--primary-foreground: oklch(0.99 0 0)`
- `--destructive: oklch(0.58 0.22 27)`

Dark theme:
- `--background: oklch(0.18 0.005 80)` — near-black, warm
- `--foreground: oklch(0.96 0.005 80)`
- `--muted-foreground: oklch(0.68 0.008 80)`
- `--border: oklch(1 0 0 / 0.08)`
- `--card: oklch(0.22 0.005 80)` — slightly lifted from `--background`
- `--primary: oklch(0.72 0.11 128)` — lifted-L olive for legibility on dark
- `--primary-foreground: oklch(0.18 0 0)`
- `--destructive: oklch(0.7 0.19 22)`

Note: the six accent tints (blue/amber/green/purple/rose/teal) below are decorative — they stay as a utility palette for stat chips and channel chips even though the brand primary is no longer teal. Stat-tile tone assignments in §4 are unchanged.

### Accent tints (new — for stat chips and channel chips)

Six tone pairs, each with a `-tint` (background) and `-fg` (foreground) value, defined in `:root` and overridden in `.dark`. Replaces the hardcoded `bg-blue-100 text-blue-600` strings currently used on the dashboard, which do not adapt to dark mode.

Light theme example values:
- `--accent-blue:    oklch(0.95 0.04 240); --accent-blue-fg:    oklch(0.46 0.13 240);`
- `--accent-amber:   oklch(0.95 0.05 75);  --accent-amber-fg:   oklch(0.50 0.12 75);`
- `--accent-green:   oklch(0.95 0.05 145); --accent-green-fg:   oklch(0.46 0.10 145);`
- `--accent-purple:  oklch(0.95 0.04 300); --accent-purple-fg:  oklch(0.48 0.13 300);`
- `--accent-rose:    oklch(0.95 0.04 20);  --accent-rose-fg:    oklch(0.52 0.16 20);`
- `--accent-teal:    oklch(0.94 0.04 175); --accent-teal-fg:    oklch(0.42 0.09 175);`

Dark theme uses inverted L (~0.30 background, ~0.78–0.82 foreground) for the same hue/chroma.

### Radius

Bump default from `0.625rem` (10px) to `0.75rem` (12px). The existing `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` derivations in `index.css` follow.

### Typography

- `h1`: `text-3xl font-semibold tracking-tight` (was `font-bold`)
- `h2`: `text-xl font-semibold tracking-tight`
- Card title: `text-base font-medium`
- Stat values & numeric table cells: `font-variant-numeric: tabular-nums`
- System font stack unchanged.

### Spacing / density

- Page container max-width bumps to `max-w-6xl`.
- Card padding standardizes at `p-5` (was `p-6` default with `py-4` overrides in some places).
- Section gap standardizes at `space-y-6`; top-level page sections use `space-y-8`.

### Surfaces

All cards: `bg-card border rounded-xl shadow-xs p-5`. Hover state where interactive: `hover:bg-accent/40` (was `hover:bg-accent` full).

## 2. Iconography system

### Rules

- Single library: `lucide-react`. After §7 cleanup rewrites the Footer, `react-icons` is no longer imported and is dropped from `package.json`.
- Single stroke width (default `2`).
- Canonical sizes: `size-3.5` (14px) / `size-4` (16px) / `size-4.5` (18px) / `size-5` (20px).
- Action icons (more, edit, delete, plus) are monochrome — inherit text color.
- Decorative / identifier icons (channel types, stat chips, section headers) take an accent tint from §1.
- One icon per concept, app-wide.

### Canonical concept map

| Concept | Current | Proposed | Reason |
|---|---|---|---|
| Sidebar: Dashboard | `Home` | `Home` | unchanged |
| Sidebar: Contacts | `Users` | `Users` | unchanged |
| Sidebar: Interactions | `MessageCircle` | `MessagesSquare` | reads as "all conversations" not "chat" |
| Sidebar: Tags | `Tag` | `Tag` | unchanged |
| Sidebar: Groups | `FolderOpen` | `UsersRound` | groups are people, not files |
| Sidebar: Reminders | `Bell` | `Bell` | unchanged |
| Sidebar: Journal | `BookOpen` | `NotebookPen` | journal implies writing |
| Sidebar: Admin | `Users` (collision) | `ShieldCheck` | distinguishes from Contacts |
| "More actions" trigger | `MoreHorizontal` / `EllipsisVertical` (mixed) | `MoreHorizontal` everywhere | one trigger |
| Edit button | `Edit` / `Pencil` (mixed) | `Pencil` everywhere | universally recognized |
| Delete | `Trash2` | `Trash2` | unchanged |
| Add | `Plus` | `Plus` | unchanged |
| Custom fields card | `Sparkles` | `ListPlus` | Sparkles reads as AI |
| Losing touch | `AlertTriangle` | `Clock` | time-since framing |
| Recent interactions header | `MessageCircle` | `MessagesSquare` | matches sidebar |
| Field: email | `Mail` | `Mail` | unchanged |
| Field: phone | `Phone` | `Phone` | unchanged |
| Field: url | `Globe` | `Link` | more universal |
| Field: social | `Hash` | `AtSign` | @-handle is the modern read |
| Field: im | `MessageCircle` | `MessageSquareText` | distinguishes from sidebar Interactions |
| Pets card | `PawPrint` | `PawPrint` | unchanged |
| Life events | `CalendarDays` | `CalendarHeart` | personal events |
| Relationships card header | (none) | `HeartHandshake` | new section icon |
| Addresses | `MapPin` | `MapPin` | unchanged |
| Favorite | `Star` | `Star` | unchanged |
| Archived | `Archive` | `Archive` | unchanged |
| Birthday meta | `Calendar` | `Cake` | unambiguous |
| "Met via" meta | `Users` | `UserRoundSearch` | distinguishes from "Contacts" |
| Last contacted meta | `Clock` | `Clock` | unchanged |

Decision: sidebar active state stays as solid teal fill (shadcn/Radix default). No override of `sidebarMenuButtonVariants`.

### Channel icons (interaction timeline + add dialog)

Same map both places. Each chip uses an accent tint per channel.

| Channel | Icon | Tint |
|---|---|---|
| `call` | `Phone` | blue |
| `in_person` | `Coffee` (was `Users`) | amber |
| `text` | `MessageSquare` | green |
| `email` | `Mail` | rose |
| `video` | `Video` | purple |
| `social` | `AtSign` | teal |
| `other` | `MoreHorizontal` | neutral |

### `lib/icons.ts` re-export module

Single module re-exports every lucide icon used by the app. Future renames or library swaps happen in one place. Components import from `@/lib/icons`, never directly from `lucide-react`.

## 3. Component patterns

Six reusable patterns. Most live in `src/components/Common/`; one tweaks an existing `src/components/ui/` file.

### 3.1 Sidebar nav active state — keep current

Solid teal fill (`bg-primary text-primary-foreground`) on active items. No code change to `components/ui/sidebar.tsx`.

### 3.2 Card surface — uniform pattern

All top-level cards: `rounded-xl border shadow-xs p-5`. Card headers use `flex items-center justify-between gap-2` with title (`text-base font-medium`) on the left and any action on the right.

`components/ui/card.tsx` gets the radius/padding bump via the token defaults. Inline `flex-row` overrides in current code are removed in favor of the standard pattern.

### 3.3 `SectionHeading` — new

`src/components/Common/SectionHeading.tsx`

```tsx
interface SectionHeadingProps {
  icon: LucideIcon
  title: string
  count?: number
  action?: ReactNode
}
```

Renders: `<icon class="size-4 text-primary" /> <span class="text-base font-semibold tracking-tight">{title}</span> {count != null && <span class="text-sm text-muted-foreground">{count}</span>} {action && <div class="ml-auto">{action}</div>}`

Replaces ad-hoc `<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">` patterns across dashboard and contact detail.

### 3.4 `RowActionsMenu` — new

`src/components/Common/RowActionsMenu.tsx`

```tsx
interface RowActionItem {
  label: string
  icon: LucideIcon
  onSelect: () => void
  variant?: "default" | "destructive"
}

interface RowActionsMenuProps {
  items: RowActionItem[]
}
```

Always uses `MoreHorizontal` trigger, always `align="end"`, destructive items get `text-destructive`. Replaces the inline `<DropdownMenu>`-with-`MoreHorizontal` pattern in:

- `components/Contacts/ContactActionsMenu.tsx`
- `components/Tags/TagActionsMenu.tsx`
- `components/Groups/GroupActionsMenu.tsx`
- `components/Reminders/ReminderActionsMenu.tsx`
- `components/Journal/JournalActionsMenu.tsx`
- `components/Admin/UserActionsMenu.tsx` (also unifies trigger from `EllipsisVertical` → `MoreHorizontal`)
- The inline dropdown inside `components/Contacts/ContactFieldsCard.tsx#FieldRow`

### 3.5 `StatTile` — new

`src/components/Common/StatTile.tsx`

```tsx
interface StatTileProps {
  icon: LucideIcon
  label: string
  value: number | string
  tone: "blue" | "amber" | "green" | "purple" | "rose" | "teal"
  to?: string  // optional TanStack Router path; when present the tile renders as <Link>, otherwise a plain <div>
}
```

Renders the dashboard stat-card pattern with a tinted icon chip pulling `bg-[var(--accent-{tone})] text-[var(--accent-{tone}-fg)]`. Replaces the inline `stats` array in `routes/_layout/index.tsx` whose hardcoded `bg-blue-100/text-blue-600` strings do not adapt to dark mode.

### 3.6 `EmptyState` — new

`src/components/Common/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}
```

Centered layout: 44px icon chip (neutral tint — `bg-muted text-muted-foreground`, no per-instance tone prop), title in `text-sm font-medium`, optional description in `text-xs text-muted-foreground`, optional CTA below. Container uses `border-dashed` to distinguish from data cards. Replaces the bare `<p class="text-sm text-muted-foreground">No interactions yet</p>` pattern in 6+ places.

## 4. Page-level changes

### Dashboard (`routes/_layout/index.tsx`)

- Stats grid → 5 × `<StatTile>` (Contacts/blue, Tags/purple, Groups/green, Reminders/amber, Entries/teal).
- "Losing Touch" + "Recent Interactions" sections use `<SectionHeading>` with `Clock` and `MessagesSquare` respectively.
- Each section's empty branch renders `<EmptyState>` instead of being silently hidden.
- `text-3xl font-bold` headline → `text-3xl font-semibold tracking-tight`.
- Recent contacts grid: cards adopt the new uniform pattern (12px radius, `shadow-xs`).

### Contact detail (`routes/_layout/contacts/$contactId.tsx`)

- Header: `font-bold` → `font-semibold tracking-tight`. Meta row swaps `Calendar` → `Cake` (birthday), `Users` → `UserRoundSearch` ("Met"). `Clock` for "Last contacted" stays.
- Tabbed sections (Interactions / Notes / Gifts / Debts): each empty branch becomes an `<EmptyState>` with the right icon.
- Each tab's add button (`AddInteractionDialog`, `AddGift`, `AddDebt`) moves into the `EmptyState`'s `action` slot when the list is empty; stays in the existing `flex justify-end` row when there is data.

### Contact card files (uniform header pattern + new icons)

- `components/Contacts/ContactFieldsCard.tsx`: swap `Hash` → `AtSign`, `Globe` → `Link`, `MessageCircle` → `MessageSquareText` in `fieldTypeIcon` map. Replace inline `MoreHorizontal` dropdown in `FieldRow` with `<RowActionsMenu>`.
- `components/Contacts/AddressesCard.tsx`: keep `MapPin`, replace inline dropdowns.
- `components/Contacts/PetsCard.tsx`: keep `PawPrint`, replace inline dropdowns.
- `components/Contacts/LifeEventsCard.tsx`: `CalendarDays` → `CalendarHeart`, replace inline dropdowns.
- `components/Contacts/CustomFieldsCard.tsx`: `Sparkles` → `ListPlus`, replace inline dropdowns.
- `components/Contacts/RelationshipsCard.tsx`: add `HeartHandshake` to header, replace inline dropdowns.
- All card headers adopt the standard `flex items-center justify-between` pattern.

### Sidebar (`components/Sidebar/AppSidebar.tsx`)

Update icon imports per the canonical map: `MessageCircle` → `MessagesSquare` (Interactions), `FolderOpen` → `UsersRound` (Groups), `BookOpen` → `NotebookPen` (Journal). Admin entry switches its icon from `Users` to `ShieldCheck`.

### Action menu wrappers — collapse to one-liners

Each existing `*ActionsMenu.tsx` becomes a thin wrapper passing items to `<RowActionsMenu>`. Files affected: see §3.4 list.

### Edit dialog buttons

`components/Contacts/EditContactDialog.tsx`: `Edit` → `Pencil`. (`Admin/EditUser.tsx` already uses `Pencil`; no change.)

### `components/Interactions/InteractionTimeline.tsx`

- Channel icon map updates per §2.
- Each row wraps its channel icon in a tinted chip matching the per-channel tone palette (call=blue, in_person=amber, text=green, email=rose, video=purple, social=teal, other=neutral).
- Empty branch becomes `<EmptyState>`.

### List pages (no per-file edits)

`contacts.tsx`, `tags.tsx`, `groups.tsx`, `reminders.tsx`, `journal.tsx`, `interactions.tsx` use `DataTable` with no structural change. They inherit radius/border/spacing through the shadcn token bump.

### Pages explicitly not touched

- Auth pages (login, signup, recover-password, reset-password).
- `admin.tsx` — table only, inherits token changes.
- `settings.tsx` — small page, inherits token changes.

## 5. Risks

1. **E2E test selectors.** Tests in `frontend/tests/` and `e2e/` may reference icon-specific selectors like `[data-lucide="message-circle"]`. Grep the suite before migration; update any selectors that match.
2. **OKLCH browser support.** Already in use; no regression. Floor: Safari ≥15.4, Chrome ≥111, Firefox ≥113.
3. **`color-mix()` in `badge primary` variant.** Same support floor as OKLCH.
4. **Dark-mode regression.** The hardcoded `bg-blue-100/text-blue-600` chips currently look broken in dark mode. The new accent tints fix this. Manual pass through every page in both modes after migration.
5. **`MessagesSquare` vs `MessageSquareText`.** Both used in different contexts (sidebar nav vs IM field). Verify legibility at 16px in both spots.
6. **Conditional add-button placement** on contact-detail tabs (in empty-state when empty, in header row when populated). Slightly more complex than the current always-visible pattern.
7. **Component rename churn.** Replacing 7 inline action menus touches 7 files. Plan: separate commits per file, with a quick visual smoke check after each.
8. **Favicon stays FastAPI-branded.** The §6 cleanup updates titles, copy, and the in-app logo, but `favicon.png` is image content that may still carry the FastAPI mark. Generating a replacement is out of scope for this code-only pass; flag as a follow-up.
9. **`kindred-logo-dark.png` is 4.6 MB.** Likely a high-res PNG export. The light variant is 225 KB. Plan to run the dark file through `pngquant` or `oxipng` (target ≤300 KB) before merge — otherwise every dark-mode page load ships a 4.6 MB image. Implementation step 2 (§7) includes this optimization.
10. **No icon-only logo variant.** Per §6 decision B, the collapsed sidebar header renders nothing. Acceptable for first ship; if it looks empty, follow-up is to author a separate icon-only asset.

## 6. FastAPI template cleanup

The project was scaffolded from the Full Stack FastAPI Template. Several leftover references must be removed in the same pass — failing to do so leaves the polished UI shell wrapped in template branding.

### Logo (`components/Common/Logo.tsx`)

The Kindred brand uses a custom image asset (3 stylized people figures with rays + the "KINDRED" wordmark in olive/charcoal). The Logo component keeps its image-based structure but points at the Kindred assets instead of FastAPI.

Image assets in `frontend/public/assets/images/`:

| File | State | Used for |
|---|---|---|
| `kindred-logo.png` | already saved (225 KB) | light mode |
| `kindred-logo-dark.png` | already saved (4.6 MB — needs optimization, see risks) | dark mode |
| icon-only variant | not yet created | collapsed sidebar — see decision below |

**Icon-only variant decision.** The current Logo supports a `variant="icon"` mode for the collapsed sidebar. Two options:

- **A** — Use the full wordmark in every variant. The collapsed sidebar already hides labels via `group-data-[collapsible=icon]:hidden`; the full-width wordmark will be cut off / overflow. Bad fit.
- **B (recommended)** — Drop the `variant="icon"` mode entirely from Logo callers. In the collapsed sidebar the Logo is hidden and the sidebar header stays empty (the nav-item icons themselves already provide enough visual identity in collapsed mode). Single asset path; simplest to ship.
- **C** — Author a separate icon-only PNG/SVG (just the people-with-rays glyph, no wordmark). Cleanest visually but requires another asset.

We're going with **B** for the first ship; option C can land as a follow-up if the empty collapsed-header bothers anyone.

Component logic mirrors the current FastAPI Logo — same `variant` and `asLink` props, same `useTheme` hook for the light/dark swap. Only the import paths and alt text change:

```tsx
import logo from "/assets/images/kindred-logo.png"
import logoDark from "/assets/images/kindred-logo-dark.png"
// useTheme().resolvedTheme === "dark" ? logoDark : logo
// alt="Kindred"
```

When `variant="icon"`, render `null` (per option B above) — callsites that only show the collapsed Logo will simply render nothing.

### Footer (`components/Common/Footer.tsx`)

Drop the social links to the fastapi GitHub / X / LinkedIn entirely — they have no place in a personal CRM. Footer becomes a single muted line:

```tsx
<footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
  Kindred · {currentYear}
</footer>
```

This removes the only consumer of `react-icons`, which is then dropped from `package.json` (and `bun.lock`).

### `index.html`

- `<title>Full Stack FastAPI Project</title>` → `<title>Kindred</title>`
- Remove the dead `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` line — `/vite.svg` does not exist in `public/`
- Keep the `favicon.png` link as-is (replacement is a separate task)

### Page titles

All 8 routes that currently set a page title need updating to use the new `"X · Kindred"` suffix:

- `routes/login.tsx` — was `"Log In - FastAPI Template"`
- `routes/signup.tsx` — was `"Sign Up - FastAPI Template"`
- `routes/recover-password.tsx` — was `"Recover Password - FastAPI Template"`
- `routes/reset-password.tsx` — was `"Reset Password - FastAPI Template"`
- `routes/_layout/admin.tsx` — was `"Admin - FastAPI Template"`
- `routes/_layout/settings.tsx` — was `"Settings - FastAPI Template"`
- `routes/_layout/index.tsx` — was `"Dashboard - Personal CRM"` (also rebrands from the working name)
- `routes/_layout/contacts/index.tsx` — was `"Contacts - Personal CRM"` (same)

### Asset cleanup

Delete the four FastAPI SVG assets after the Logo rewrite verifies in the browser:

- `frontend/public/assets/images/fastapi-icon.svg`
- `frontend/public/assets/images/fastapi-icon-light.svg`
- `frontend/public/assets/images/fastapi-logo.svg`
- `frontend/public/assets/images/fastapi-logo-light.svg`

Optimize the 4.6 MB dark-mode Kindred PNG in place — `pngquant --quality=85-95 --strip kindred-logo-dark.png --output kindred-logo-dark.png` or `oxipng -o 4 --strip safe kindred-logo-dark.png`. Target ≤300 KB.

Leave `favicon.png` in place — replacing it requires generating a new icon image and is out of scope for this pass.

## 7. Implementation order

1. Token + dependency setup: update `src/index.css` with new tokens and accent vars; add `src/lib/icons.ts` re-export module.
2. FastAPI template cleanup (§6): rewrite Logo to point at `kindred-logo.png` / `kindred-logo-dark.png` (optimize the dark PNG), rewrite Footer (this drops the only `react-icons` consumer), update `index.html` and the 8 page titles, delete the 4 FastAPI SVG assets, drop `react-icons` from `package.json` / `bun.lock`.
3. Build new shared components: `StatTile`, `SectionHeading`, `RowActionsMenu`, `EmptyState`.
4. Migrate dashboard.
5. Migrate contact detail (header, cards, tabs).
6. Migrate sidebar + standalone action-menu wrappers.
7. Migrate `InteractionTimeline` (channel chips).
8. Pass through every page in light + dark modes; fix any leftover hardcoded colors.

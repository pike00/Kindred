# Frontend editorial refresh — design

Date: 2026-04-19
Builds on: `2026-04-18-frontend-style-pass-design.md` (shipped) + the 2026-04-19 Kindred UX fix list (shipped).
Scope: second visual pass that gives Kindred personality. Editorial hero on dashboard, avatar-forward contact rows, a display sans face on headings/names, pill buttons, softer surfaces, and a single featured-card gradient treatment. No new backend, no routing changes, no data model changes.

## Goals

- Kindred should stop reading as "stock shadcn" and start reading as "a warm personal app made for you."
- Avatar-forward identity everywhere a contact appears.
- One strong editorial moment on the dashboard ("Stay in touch") that the app is visibly built around.
- Consistent display/body type pairing across the app.
- Keep the shipped 2026-04-18 token system, accent palette, and shared components intact. Extend, don't restart.

## Non-goals

- Auth pages (login, signup, recover-password, reset-password). They inherit token changes and nothing else.
- Admin and Settings pages. Token changes only.
- List-page structure for tags, groups, reminders, journal, interactions. They stay as `DataTable` and inherit token changes. (Rationale: they're not contact-centric, and the table already works.)
- Copy changes beyond the new greeting + featured-card body. Existing labels stay verbatim.
- Backend. The "Stay in touch" featured card uses only already-exposed data (`listLosingTouch`, birthday on ContactBase, `last_contacted_at`).
- Icon-only logo variant. (Collapsed sidebar still renders nothing, per the 2026-04-18 design.)
- Additional fonts beyond the two below.

## 1. Typography

### Stack

- **Display face — Cabinet Grotesk** (700 / 800). Self-hosted via Fontshare CDN. Used for:
  - `h1`, `h2`, `h3` in page titles and section headings
  - `CardTitle` in card-header composition
  - Contact names in list rows and the contact-detail header
  - Stat values (the big number in `StatTile`)
  - "Stay in touch" featured-card name
- **Body face — Inter** (400 / 500 / 600). Current. Used everywhere else.

A new `.font-display` utility class (applied via a `font-display` Tailwind config extension, `font-family: "Cabinet Grotesk", ...`) is the only way to opt into the display face. Default `font-family` stays Inter.

### Scale & tracking

| Role | Class |
|---|---|
| Page H1 | `text-4xl font-display font-bold tracking-tight` (was `text-3xl font-semibold`) |
| Page H1 subtitle | `text-base text-muted-foreground` |
| Section H2 | `text-xl font-display font-semibold tracking-tight` |
| `SectionHeading` title | unchanged; stays `text-base font-semibold tracking-tight` (it's dense, not editorial) |
| Card title | `font-display font-semibold tracking-tight` |
| Stat value | `text-2xl font-display font-bold tracking-tight` |
| Contact name (list row) | `text-base font-display font-semibold tracking-tight` |
| Contact detail H1 | `text-4xl font-display font-bold tracking-tight` |
| Tabular numerics | body font with `font-variant-numeric: tabular-nums` (unchanged) |

Tracking for display sizes is tight: -0.025em for H1/H2, -0.02em for stat values, -0.015em for contact-row names.

### Loading

Add Fontshare link tags to `frontend/index.html`:

```html
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&display=swap" rel="stylesheet">
```

Add `font-display: swap` is in Fontshare's delivery. Inter already loads via the existing import. No new npm deps.

### Config

`frontend/tailwind.config.*` or the Tailwind v4 CSS-only theme block in `src/index.css`:

```css
@theme inline {
  --font-display: "Cabinet Grotesk", "Inter", system-ui, sans-serif;
  /* --font-sans stays as the existing Inter/system stack */
}
```

This exposes `font-display` as a Tailwind utility.

## 2. Component kit updates

### 2.1 Button — shape change

`src/components/ui/button.tsx` → `buttonVariants`:

- Base: `rounded-md` → `rounded-full`
- `default` variant: add `shadow-xs` for a 1px primary-tinted drop (keeps primary button from looking flat)
- Sizes unchanged in height; `has-[>svg]:px-3` → `has-[>svg]:px-3.5` to keep the pill from looking cramped around an icon
- `lg` size: `px-6` → `px-7` (pill needs more horizontal air)

All other variants (outline, secondary, ghost, destructive, link) inherit the pill shape.

### 2.2 Input — shape & height

`src/components/ui/input.tsx`:

- `h-9` → `h-10`
- `rounded-md` → `rounded-xl` (12px)
- `px-3` → `px-3.5`
- Focus ring keeps the existing 3px behavior

Consumers pick up the new sizing automatically.

### 2.3 Card — radius & optional featured surface

`src/components/ui/card.tsx`:

- `rounded-xl` (12px default shadcn) → `rounded-2xl` (16px)
- Padding stays `py-6` default; `p-5` override in callsites continues to work
- Keep `shadow-sm` default

Cards with the featured-surface treatment don't use `Card` — they use the new `FeaturedCard` component (§3.2).

### 2.4 `ContactAvatar` — new

`src/components/Common/ContactAvatar.tsx`

```tsx
interface ContactAvatarProps {
  contact: Pick<ContactPublic, "id" | "first_name" | "last_name" | "prefix">
  size?: "sm" | "md" | "lg"  // 32 / 40 / 56 px
  className?: string
}
```

Renders a circular avatar:

- Initials from `first_name[0] + last_name[0]` (uppercased), fallback to `first_name[0]` only, fallback to "?"
- Background is a linear gradient from a 12-color palette, deterministically selected by hashing `contact.id`. The hash is `sum of contact.id character codes % 12`. Each palette slot is a from/to gradient pair defined as CSS custom properties in `:root` so dark mode can redefine them.
- Text is white at `font-display font-semibold`
- Sizes: sm = `size-8 text-xs`, md = `size-10 text-sm`, lg = `size-14 text-lg`

Palette defined in `src/index.css` under `:root` as `--avatar-1-from`, `--avatar-1-to` through `--avatar-12-from`, `--avatar-12-to`. Dark-mode overrides keep hue/chroma, shift L down ~0.15 for the gradient endpoints.

The 12 hues are spread evenly around the color wheel with a slight bias toward the warm half (more ambers / roses / tan pairs than blues / teals).

### 2.5 `FeaturedCard` — new

`src/components/Common/FeaturedCard.tsx`

```tsx
interface FeaturedCardProps {
  tone: "amber" | "blue" | "green" | "rose"  // defaults to "amber"
  children: ReactNode
  className?: string
}
```

Renders an 18px-radius container with:

- 1px border in the corresponding `--accent-{tone}` border color
- Background: `linear-gradient(135deg, white, var(--accent-{tone}))` at ~30% opacity mix
- A `radial-gradient` accent in the top-right corner, same tone, fading to transparent
- `p-6`
- `shadow-sm` on hover (not default)

Only one intended consumer for now: the dashboard's "Stay in touch" card. The API is generic so other editorial moments can reuse it later.

### 2.6 `StatTile` — no change; likely unused after this pass

The dashboard is the only consumer. §3.1 removes the stat grid from the dashboard, so `StatTile` becomes unused. Don't tweak it — delete it in step 9 of §6 if no consumers remain. Skip the dead-work of touching it first.

### 2.7 Shared list-row utility — not a component

Resist the temptation to wrap the new avatar-forward contact row as a reusable component. It has exactly one consumer (the contacts list page). If a second page ever needs it, factor then.

## 3. Page changes

### 3.1 Dashboard (`routes/_layout/index.tsx`)

Replace the current structure with:

1. **Hero greeting block** (2-col grid, `md:grid-cols-[1.2fr_1fr] gap-6`):
   - Left: H1 greeting ("Good morning, Will.") in Cabinet Grotesk at `text-4xl`. Body subtitle. Mini-stats inline row: "142 contacts · 4 losing touch · 3 reminders · 24 entries" where the numbers are `font-display font-semibold`, the labels are muted.
   - Right: `<FeaturedCard tone="amber">` with the "Stay in touch" content, using the top result from `listLosingTouch`.

2. **"Losing touch" + "Recent interactions" 2-col section** (below the hero):
   - Uses the existing `<SectionHeading>` pattern. Keep.
   - Items inside are contact-link cards as before but with `<ContactAvatar size="sm">` added to the left.

3. **Recent contacts strip** — removed. Redundant with "Losing touch" and the contacts page.

**Greeting logic**: `"Good morning"` / `"Good afternoon"` / `"Good evening"` from local time, name from `currentUser.full_name || currentUser.email`.

**Mini-stats logic**: 4 numbers — `contacts.count`, `losingTouch.count`, `reminders.count`, `journal.count`. Tags and groups fall out of the hero and are surfaced only via the sidebar (they're less daily-driver).

**Stat grid removed**: `<StatTile>` is no longer used on the dashboard. It keeps its component definition — some other page may use it later. If no consumers remain after this pass, delete it in a follow-up.

**Featured card content**:

```tsx
<FeaturedCard tone="amber">
  <p className="text-xs uppercase tracking-wider font-semibold text-accent-amber-fg">Stay in touch</p>
  <div className="flex items-center gap-3 mt-3 mb-3">
    <ContactAvatar contact={featured} size="md" />
    <div>
      <p className="font-display font-semibold text-xl tracking-tight">{fullName(featured)}</p>
      <p className="text-sm text-muted-foreground">
        {contextLine}  {/* "Last spoke 48 days ago" or "Last spoke 48 days ago · College" */}
      </p>
    </div>
  </div>
  <p className="text-sm text-muted-foreground mb-4">{bodyLine}</p>
  <Button asChild>
    <Link to="/contacts/$contactId" params={{ contactId: featured.id }}>View contact →</Link>
  </Button>
</FeaturedCard>
```

Button label is "View contact →" not "Log interaction →". Clicking navigates to the contact detail page; from there the existing "Log Interaction" button in the Interactions card is one click away. A future version could open the dialog directly from the dashboard; for v1, keep the surface area small.

`bodyLine` for v1 is a simple template, not a personalized insight:

- If `featured.birthday` is within 30 days: `"Their birthday is in ${days} days — good excuse to reach out."`
- Else: `"It's been a while since you caught up."`

(Smarter personalization — cadence analysis, life-event reminders, per-contact rhythm — is a follow-up, not blocked by this pass.)

**Empty state**: if `losingTouch.count === 0`, replace the `<FeaturedCard>` with an `<EmptyState icon={Clock} title="Everyone's caught up" description="No one's at risk of drifting — nice work." />` in the same grid slot. The left column (greeting + mini-stats) renders unchanged.

### 3.2 Contacts list (`routes/_layout/contacts/index.tsx`)

Replace the `DataTable` with avatar-forward list rows. The contacts list becomes genuinely distinct from the tags/groups/reminders tables:

- Page header: H1 "Contacts" in display face, subtitle `"${count} people"`.
- Toolbar: existing search input + "Add contact" button, now both at `h-10 rounded-xl` and `rounded-full` respectively.
- Rows: one `<Link>` per contact, full-width, `flex items-center gap-3`, `rounded-2xl border p-4 shadow-xs hover:shadow-sm hover:border-primary/30 hover:-translate-y-px transition`.
  - `<ContactAvatar size="md">` on the left
  - Middle: name in display face · body-muted title line ("Product Designer at Acme" or just company or just title, compose from `contact.title` + `contact.company`)
  - Below name: meta row — `"${daysSinceLast}d since last contact"` (colored `text-accent-amber-fg` if > 30 days, `text-accent-rose-fg` if > 60 days, muted otherwise), and last-channel icon+label
  - Right: tag chips (up to 3, overflow goes into "+N" muted chip) + favorite badge if applicable

Pagination / search behavior unchanged — the DataTable's `pageSize`, `setPageSize`, `pageIndex` logic is re-implemented inline in a thin `useContactsList` hook (or stays where the current `DataTable` stores it — review during implementation).

### 3.3 Contact detail (`routes/_layout/contacts/$contactId.tsx`)

- Header H1 gains a `<ContactAvatar size="lg">` to its left. Name goes to `text-4xl font-display font-bold tracking-tight`.
- `EditContactDialog` button stays top-right of the header block (currently next to the name — move it out to the header row's trailing edge).
- Rest of the page (left column of cards, right column with Interactions card, tabbed section at the bottom) stays as-is from the 2026-04-19 punch list. Card styling picks up the new `rounded-2xl` + display-face `CardTitle` automatically.

### 3.4 Sidebar (`components/Sidebar/AppSidebar.tsx`)

No structural change. The sidebar picks up new font, radius, and button-shape tokens automatically.

### 3.5 List pages for non-contact resources

`tags.tsx`, `groups.tsx`, `reminders.tsx`, `journal.tsx`, `interactions.tsx`, `admin.tsx`, `settings.tsx`:

- No structural change.
- Inherit new tokens (display H1, pill buttons, 12px inputs, 16px cards).
- Pages have `text-3xl font-semibold` currently. Bump to `text-4xl font-display font-bold tracking-tight` to match the dashboard.

### 3.6 Auth pages

Token-only: new font, pill buttons, 12px inputs. No structural change.

## 4. Dark mode

Every new token has a dark variant in `:root` / `.dark`:

- Avatar gradients: L shifts from ~0.80/0.70 (light mode from/to) to ~0.55/0.42 (dark)
- FeaturedCard gradient: base swaps from white + tint to `--card` + tint at the same chroma
- Pill button shadow stays (shadow-xs is already hairline)
- No new hardcoded colors anywhere

Manual QA: dashboard, contacts list, contact detail, and one auth page in both modes.

## 5. Risks & follow-ups

1. **Cabinet Grotesk availability.** Fontshare serves it free under OFL. If the CDN goes down, the body stack falls back to Inter, which is survivable but looks off at H1. Self-hosting is an option if this ever bites — download the OFL files into `frontend/public/fonts/` and switch the `@font-face` declarations local.
2. **Avatar hue collisions.** 12 colors across a few hundred contacts mean collisions are common. Acceptable — people recognize their own contacts from initials, color is secondary. Could grow to 18 or 24 later.
3. **Featured card body personalization.** v1 uses only birthday proximity. A smarter cadence-based insight ("you usually catch up every 3 weeks") would need a new backend endpoint. Flag as follow-up, not blocker.
4. **Contacts list pagination.** Moving off `DataTable` means rebuilding page-size and page-index state in either a hook or the page itself. Not hard, but a real chunk of work. Estimate: the biggest single file in this pass.
5. **Responsiveness of hero.** The 2-col hero stacks on `md:` breakpoint. On mobile, the mini-stats row can wrap; the featured card drops below the greeting. Verify on a narrow window.
6. **Performance of avatar gradients.** 150 avatars on the contacts list means 150 linear-gradient backgrounds. Cheap — no regression expected — but worth a quick check with devtools paint profiling.
7. **`StatTile` becomes unused** after this pass. Leave the component for now; delete only after the dashboard migration verifies nothing else consumes it.
8. **Dashboard featured-card empty case** (no `losingTouch.count`) shows a soft empty state. The "Recent interactions" column also needs coverage — if both are empty, the dashboard reads thin. Acceptable for a brand-new user; revisit if it proves bothersome.

## 6. Implementation order

1. **Tokens + fonts**: add the `font-display` Tailwind theme entry, add Fontshare link tags to `index.html`, add the 12 avatar gradient pairs to `index.css`.
2. **Primitive kit**: update `button.tsx` (pill), `input.tsx` (h-10 rounded-xl), `card.tsx` (rounded-2xl + display-face CardTitle).
3. **`ContactAvatar` + `FeaturedCard` components**: new files under `src/components/Common/`. Add each to the appropriate barrel or re-export if one exists.
4. **Contact detail header** migration: smallest page-level change; picks up avatar and bigger H1. Good smoke test.
5. **Dashboard hero**: biggest visible change. Replace stat grid with editorial hero + mini-stats. Wire up `FeaturedCard` with the top `listLosingTouch` result + birthday-proximity body line.
6. **Contacts list** migration: replace DataTable with avatar-forward rows. Rebuild pagination state. Biggest code churn.
7. **H1 bumps on non-contact list pages**: one-line class change each. `tags.tsx`, `groups.tsx`, `reminders.tsx`, `journal.tsx`, `interactions.tsx`, `admin.tsx`, `settings.tsx`.
8. **Dark-mode walk-through**: every page, both modes. Fix any leftover hardcoded colors.
9. **Delete unused**: if `StatTile` has no remaining consumers, delete it. If the old `DataTable` is no longer referenced by anything, delete it. Otherwise defer.

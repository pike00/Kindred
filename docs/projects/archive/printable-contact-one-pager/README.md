---
title: Printable Contact One-Pager
status: archived
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-10
next_step: Download-PDF 422 fixed (moved /{id}.pdf ahead of /{contact_id}); shipped v0.2.87.
---

# Printable Contact One-Pager

## Goal
Generate a printable PDF summary of a single contact for pre-meeting prep. The one-pager displays key fields, last 5 interactions, active debts/gifts, and relationships on a single page (A4 or Letter).

## Tasks
- [ ] Decide PDF generation approach: WeasyPrint (server-side Python) vs react-pdf (client-side React)
- [ ] Design HTML/React template with contact fields, interaction timeline, debt/gift summary, and relationship graph
- [ ] Implement /contacts/{id}.pdf endpoint in FastAPI backend
- [ ] Add download button and print preview in React UI
- [ ] Handle avatar and image embedding in PDF (base64 or fetch)

## Session Log

### 2026-06-10
- Project archived.

### 2026-06-05
- Housekeeping: Download-PDF 422 fixed (moved /{id}.pdf ahead of /{contact_id}); shipped v0.2.87.

### 2026-04-23
- Project scaffold created: README, handoffs/ directory.

### 2026-04-21
- Project created.

## Notes
- **WeasyPrint pros**: Native CSS/HTML rendering, server-side (no client deps), mature PDF output. Cons: Requires Python PDF library, extra backend complexity.
- **react-pdf pros**: No additional backend dependency, easier UI iteration, component-based template. Cons: Less flexible CSS, client-side rendering may feel slower.
- **Avatar embedding**: Store as base64 data URI or fetch from backend; WeasyPrint handles both cleanly.
- **Privacy**: Only export fields visible under TagShare rules (respect contact visibility scope).
- **Page breaks**: A4 default (210x297mm); handle relationship list overflow gracefully across pages.
- **Scope**: Initially single contact PDF; future: batch export, email delivery, scheduled snapshots.

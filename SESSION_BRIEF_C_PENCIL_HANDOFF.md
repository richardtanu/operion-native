# Session Brief C — Module 1 Procurement Wireframes → Pencil

**Send to:** the Claude Code session running in **this VS Code window**, the one with
`operion-mobile.pen` open in the Pencil editor.

**Why this brief exists:** a separate (background) Claude Code session built the wireframe
kit and PROC-01 through PROC-04 in Figma, then hit the Figma Starter plan's monthly tool-call
quota. That background session cannot reach Pencil's MCP tools at all — `get_app_state` and
friends only work from an editor session that has the `.pen` file open live, which is this
one. This brief hands the rest of the work here.

**Figma reference (for content parity only — you have no direct access):**
`https://www.figma.com/design/2RTDg3SauOtAs7PERyMybH` — wireframe kit + PROC-01–04. You don't
need to open it; the content it encodes is fully described below and in the screen inventory.

---

## Source of truth

Read `C:\operion-mobile\SESSION_BRIEF_B_DESIGN_WIREFRAMES.md` in full before drawing anything —
it contains the complete, backend-verified screen inventory (PROC-01 through PROC-08) with
every field, action, scope rule, and gap already cited `[C]` against the backend code. Do not
invent fields or endpoints not in that file.

## Task

Wireframe all 8 screens — PROC-01 through PROC-08 — into `operion-mobile.pen`, in order.
Wireframes, not visual design: layout, hierarchy, and control choices only. No colour, no
typography, no branding.

First call `get_app_state({ include_schema: true, include_canvas_design: true,
include_scripts_and_shaders: false })` to learn the `.pen` file's schema and conventions
before creating anything — do this fresh, don't assume Figma conventions apply.

## Reusable wireframe kit (build once, reuse across screens)

Replicate this component vocabulary in Pencil's own idiom (adapt to whatever Pencil actually
supports):

- **Button** — Primary (filled/dark, main action) and Secondary (outlined, lesser action)
  variants
- **TextField** — Editable (white/bordered input) and Readonly-derived (gray/italic, for
  server-computed values like "remaining balance" that are never stored)
- **Chip** — a status badge; screens with more than one independent status dimension use
  multiple chips side by side, never one merged chip
- **Callout** — a dashed-border note box for recording what the drawing revealed that the
  record didn't anticipate, or an open question surfaced by drawing it. Never resolve an open
  question by drawing an answer to it — draw the question visible and flag it.

Build the kit as reusable components/symbols if Pencil supports that pattern; otherwise keep a
consistent manual style across all 8 screens.

## Domain rules that a wireframe gets wrong by default (all `[C]`-verified — treat as fixed)

- **PRA screen has no Approve button.** Creating the PRA *is* the authorization.
- **PRA screen shows a set of purchase requests, not one** — one PRA can authorize several PRs.
- **PRA ceilings have no header total** — per-line only. If drawing it makes the absence feel
  wrong, say so as a callout; don't add a summary field.
- **Never show a stored "remaining" balance** — always the Readonly-derived field style, never
  a plain editable/stored field.
- **Realisasi has two independent status dimensions** (`status` and `varianceStatus`, plus
  `reimbursementStatus` when relevant) — never collapse to one chip.
- **Realisasi correction is supersede, not edit** — no edit form; the original and its
  replacement both stay visible.
- **Six separate cost inputs on Realisasi**, never one total: subtotal, seller discount,
  platform voucher, shipping, insurance, service fee (total shown as derived/readonly).
- **Attachments is a URL text field, not a file picker.**
- **Purchased and received quantities are in different units** — any screen showing both must
  label the unit on each (purchase UOM vs. stock units).
- **Cost fields are scope-restricted below OWNER** where the record says so — draw the
  lower-scope variant too where relevant.
- **Flag any label containing `airsoft`, `unit`, `gun`, or `part`** — a rename to
  `ServiceableUnit` is coming; don't bake these in as permanent.
- **PROC-07 (Purchase Order)**: draw `totalAmount`/per-item `price` with the same OWNER+-only
  cost visibility as PROC-03/PROC-04, even though the backend gap (`BE-11`) means today's API
  doesn't actually redact it yet. Draw the intended state, not the current bug.

## What to produce per screen

1. One wireframe.
2. A short callout/note recording anything the drawing revealed the record didn't anticipate.
3. If a screen can't be drawn from its record alone, stop and report what's missing rather than
   inferring it.

## Screens, in order

- **PROC-01** — Purchase Request Create: line-item picker (Part + Quantity, repeatable),
  Create action. No scope gate today (flag as open question). No Approve button here (that's
  PROC-02).
- **PROC-02** — PR Approval Console: list (ID, requester, items, status, created) + detail
  panel with Approve/Reject (Owner-only) and Cancel (no scope gate — flag the asymmetry) +
  history.
- **PROC-03** — PRA Authorization: multi-select of APPROVED PRs, per-line ceiling entry (qty +
  max value), no Approve button, 4-state status chip (ACTIVE/PARTIALLY_FULFILLED/FULFILLED
  /CANCELLED), derived remaining qty/value, no header total, flag complete absence of scope
  gating and the cost-visibility gap (BE-06 candidate).
- **PROC-04** — Realisasi Entry & Review: link to PRA line, purchase details (order ref,
  channel, supplier, payment ref/method, purchased-at, URL attachments field), six cost inputs
  + derived total, items table with purchase-UOM-labeled quantities, two status chips (status +
  varianceStatus) + reimbursement chip, supersede history (original + replacement both
  visible), Approve(escalated/Owner)/Reject/Supersede/Cancel actions. Flag SoD rule (PRA
  approver ≠ Realisasi creator, Owner/Principal exempt) even though it's not a drawable
  control.
- **PROC-05** — Goods Receipt: receive-against-PO vs receive-against-Realisasi (mutually
  exclusive), items with stock-unit quantities. Flag: DL-11 segregation-of-duties check exists
  only on the Realisasi path (receiver ≠ creator, no exemption), not the PO path. Flag:
  Realisasi path blocks receiving if `attachments` is null. Flag: stock/PartInstance side
  effects on save, with landed cost stamped only on the Realisasi path (null on PO path —
  expected, not a bug). Flag: no list/detail GET endpoints exist — a "recent receipts" screen
  isn't servable today. Flag: no notification fires on receipt, unlike PROC-01–04.
- **PROC-06** — Supplier Management: create + list, thin DTO (name, contact, createdAt only).
  Flag: gated to root tenant only (tenancy-hierarchy gate, not a scope gate) — non-root outlets
  silently see the root's list. No edit/delete exists.
- **PROC-07** — Purchase Order (franchise leg): create (DRAFT, optionally from approved PRs) →
  send to supplier (ORDERED) → cancel; list/detail/history. No scope gating anywhere, including
  "send." Cost fields (`totalAmount`, per-item `price`) drawn as OWNER+-only per the note
  above.
- **PROC-08** — Reimbursement Queue: view-only, client-filtered list of Realisasi records where
  `paymentMethod=PERSONAL_REIMBURSABLE` and `reimbursementStatus=PENDING`. **Do not add a "mark
  as reimbursed" button** — that endpoint doesn't exist in the backend at all (orphan action,
  would fail Gate 1). Reuses PROC-04's cost fields/redaction.

## Gates to run once at the end, across all 8 screens (matches the brief's own methodology)

1. Orphan check — every screen has ≥1 entry point.
2. Dead-end check — every screen completes a task or leads somewhere (PROC-08's queue view is
   fine even though its one action is orphaned).
3. Segregation-of-duties check — record the three real SoD findings above (PROC-04, PROC-05
   Realisasi path, PROC-05 PO path has none).
4. Cost visibility check — which screens carry cost fields and whether they're redacted below
   OWNER (PROC-03 yes, PROC-04 yes, PROC-05 indirectly via PartInstance, PROC-07 flagged gap,
   PROC-08 inherits PROC-04).
5. Deferred-decision log — consolidate every "flag, don't resolve" note above into one list at
   the end.

Report back when done: which screens got built cleanly, which (if any) you had to stop on for
missing info, and the consolidated gate-5 deferred-decision log.

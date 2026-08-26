# Session Brief E — Module 1 Procurement: Pencil Redraw Against the Real Design System

**Send to:** the Claude Code session in the editor window that has `operion.pen` open live
(Pencil MCP tools — `get_app_state`, `get_guidelines`, `execute` — only work from that
session; a background/headless session cannot reach them at all. Confirmed this session:
`get_app_state` errored "a file needs to be open in the editor" with no `.pen` file open
here.)

**Status:** Not started. This is a full handoff, not a continuation — read everything
below before touching `operion.pen`.

---

## Why this brief exists

`SESSION_BRIEF_C_PENCIL_HANDOFF.md` drew the original 8-screen wireframe kit
(PROC-01…08) against **placeholder** styling — `theme/tokens.js` at the time said outright
"no visual design has happened yet." That has changed: `base_design/tokens.js` and
`base_design/operion-module1-mobile-screens.jsx` are a finished design pass ("range safety
board" — concrete grounds, stencilled Barlow Condensed/Barlow/IBM Plex Mono type, hazard
yellow as the one loud signal), and the mobile app (`operion-mobile`, this repo) has
already been rebuilt against it in `theme/tokens.js`, `components/`, and all 8
`app/(app)/…` procurement routes.

**Redraw `operion.pen`'s kit and all 8 PROC screens to match** — both the new visual
language and several **content corrections** the reference JSX makes to the original
wireframe (listed per-screen below). This is not a restyle-only pass; some screens change
structurally.

---

## Before touching anything

1. Call `get_app_state({ include_schema: true, include_canvas_design: true,
   include_scripts_and_shaders: false })` fresh — don't assume the schema from
   `SESSION_BRIEF_C`'s era still holds.
2. Call `get_guidelines()` to see what guides/styles are available, and load whichever is
   relevant before drawing.
3. Read `base_design/tokens.js` and `base_design/operion-module1-mobile-screens.jsx` in
   full — the second file is a working React reference implementation of every screen
   against the real tokens; treat its JSX structure and its per-screen `notes` arrays as
   the content spec, not just visual inspiration.

---

## Token swap (applies to the kit and every screen)

Pull every value from `base_design/tokens.js` (or the copy now at `theme/tokens.js` in
this repo — identical). Key structural changes from the old kit:

- **Colors**: flat palette, not nested — `ground/surface/panel/derived/ink/steel/mute/
  line/hair/tag/good/warn/danger/info`. `tag` (hazard yellow, `#E8B10A`) is the *only* loud
  color — everything else is deliberately muted concrete/ink.
- **Type**: three families, one job each — Barlow Condensed (`display`/`displayBold`) for
  headings and stencilled labels, Barlow (`body`/`bodyMedium`) for prose, IBM Plex Mono
  (`mono`/`monoMedium`) for anything read back aloud (IDs, quantities, money, timestamps).
- **Radius**: near-square now — `sm: 2, md: 4, pill: 999`. Rounded corners read consumer;
  this is equipment. Chips are no longer filled pills — outline-by-default rectangular
  badges, `solid` only for the one status that should read loudest.
- **Chip tones**: `neutral→steel, success→good, warning→warn, danger→danger,
  pending→info`.

## Reusable kit (redraw once, apply everywhere)

Matches `operion-mobile`'s `components/` exactly — draw these as the kit's symbols/
components:

- **Button** — Primary (filled ink), Secondary (outline, line-colored border), **Gated**
  (new: outline, tag-yellow 2px border, optional small mono "OWNER+"-style badge) — gated
  marks an action that's actually scope-checked server-side; plain border means anyone can
  press it. Don't add the gated look to an action that isn't really gated.
- **Field** (replaces the old plain TextField as the primary form control) — variants
  `edit` (bordered box, ink text), `derived` (no border, `derived` background, italic
  steel text, lock icon — server-computed, never editable), `picker` (bordered box,
  chevron-right, opens a selection list). Optional `mono` (IDs/qty/money) and `sub`
  (helper caption below).
- **Chip** — outline by default, `solid` fill optional. Screens with two independent
  status dimensions (Realisasi) render two side by side, never merged.
- **Callout** — dashed border, tone-aware (neutral/success/warning/danger). Used for open
  questions and build-time findings, never to resolve a question by drawing an answer.
- **Section** — uppercase stencilled label with a hairline rule underneath.
- **Card** — bordered panel, optional tone border (warning/danger) for blocking states.
- **KV** — key/value summary row, `strong` (headline figure) and `derived` (italic/steel)
  modifiers.
- **CeilingBar** — PRA consumption meter: grey track, ink fill for consumed, no stored
  "remaining" value (always computed live from authorized/consumed).

---

## Per-screen redraw spec

Content and layout below are pulled directly from
`base_design/operion-module1-mobile-screens.jsx`'s `P01`…`P08` components and each
screen's `notes` array in the `SCREENS` registry at the bottom of that file — read that
file for the exact copy/microtext rather than paraphrasing from this table.

### PROC-01 — Purchase Request Create
Line items (Part + Qty, repeatable, `+ Add line`), "Requested by: you (current user)"
derived field, "Starts at: PENDING" chip. Callouts: no cost fields on this screen; no
role/scope gate (open question); Part picker has no backing endpoint (drawn generically).
**No content correction from the original wireframe** — same structure, new styling only.

### PROC-02 — PR Approval Console
**Correction:** the original wireframe drew **four** status filters. The real enum has
**six** — `PENDING/APPROVED/REJECTED/ORDERED/AUTHORIZED/CANCELLED`. `AUTHORIZED` is the
state every PR reaches on the direct-purchase path; redraw the filter row with all six.
List rows (ID, line count, requester, status chip) + selected-record detail + history +
Approve/Reject (gated, Owner+) + Cancel (plain, no gate) — the asymmetry is the point,
carry it in the border treatment, don't normalize it away.

### PROC-03 — PRA Authorization
Multi-select checklist of APPROVED PRs (checkbox rows, not a dropdown — one PRA can
authorize several PRs). Repeatable ceiling lines (Part picker, Authorized qty, Max value).
**No Approve button** — creation is the authorization. **No header total** — deliberate,
per-line ceilings only; if the absence feels unbalanced, that's the intended signal, not a
defect to fix. **Added in the redraw**: a `CeilingBar` per line (consumed vs authorized)
replaces plain purchased/remaining text rows — the data already exists on the read
endpoint. 4-state status chip (ACTIVE/PARTIALLY_FULFILLED/FULFILLED/CANCELLED). Callouts:
no notification fires on PRA creation (danger tone); complete absence of scope gating on
create/cancel.

### PROC-04 — Realisasi Entry & Review
**Structural change from the original wireframe:** split into **3 steps** (Receipt / Costs
/ Items) via a step selector, not one long scroll — this is the module's densest screen.
- **Receipt**: PRA/line picker, Channel, Supplier picker, Payment method, Payment ref,
  Purchased-at, Attachment (URL field, not a file picker — optional here on purpose so an
  urgent purchase is never blocked from being logged; Goods Receipt refuses without it
  later).
- **Costs**: six separate inputs — Subtotal, − Seller discount, − Platform voucher, +
  Shipping, + Insurance, + Service fee — plus a derived, non-editable Total. Never
  collapse to one total field.
- **Items**: one item card (Part / purchase UOM, Qty in purchase UOM, Unit price), derived
  "Into stock" (converted to stock units) and "Allocated landed cost" rows. Two status
  chips side by side — `status` and `varianceStatus` — never merged into one. Plus a
  reimbursement chip when relevant.
**Correction:** the original wireframe only drew the escalated outcome. In-ceiling
purchases **auto-approve at creation** (`status=APPROVED` directly, no approval step) —
draw both outcomes, not just the escalated one. Approve (gated, Owner+, escalated-only) /
Reject / **Supersede** (not an edit — creates a new record, flips the original to
SUPERSEDED, both stay visible, linked by `supersedesId`).

### PROC-05 — Goods Receipt
Toggle: "By purchase order" / "By realisasi" (mutually exclusive, never both). Item card
with purchased-vs-received quantities, **each labeled with its unit** (purchase UOM vs
stock units — a live source of user error if unlabeled). Realisasi path: blocking red
`Card` if `attachments` is missing ("Cannot receive — no attachment on file"), plus a
callout that the receiver≠creator rule has **no Owner exemption** here (unlike PRA's
rule, which has one). PO path: no attachment requirement, no receiver check at all — draw
that asymmetry, don't assume symmetry was intended. Callout: no notification fires on
receipt, unlike every screen upstream.
**Known tension, flag but don't resolve:** the original screen record tagged this
web-console-only ("a paperwork step, not a barcode action"). It was deliberately overridden
to build on mobile anyway this pass — draw it, but keep the callout noting the tension
rather than silently dropping it.

### PROC-06 — Supplier Management
List (name, contact) + "New supplier" form.
**Correction:** the original wireframe drew the create form live for everyone. Creation
actually throws server-side unless the caller is on the root tenant — **draw the form
gated/disabled with a lock icon and explanatory copy**, not live-then-erroring. Callout:
a non-root outlet silently sees the *root's* supplier list with no tenant-context
indicator — kept visible rather than hidden, an unconsidered side effect worth naming.
No edit/delete anywhere — a row can only ever show as read-only detail.

### PROC-07 — Purchase Order (Franchise Leg)
Supplier picker (legacy, optional — a callout notes new code shouldn't rely on it; that
role moved to Realisasi), "From purchase requests" multi-select (every linked PR must
already be APPROVED), item lines (Part, Qty, flat Price — no cost components, no landed
cost, no conversion factor on this path). Status chip (5 values:
DRAFT/ORDERED/PARTIALLY_RECEIVED/RECEIVED/CANCELLED). Send-to-supplier / Cancel — **draw
both plain, no gate** — neither is scope-checked today, including "send," arguably as
consequential as a PRA authorization. **Cost visibility:** draw `totalAmount` and per-item
`price` as **Owner+-only**, matching PROC-03/04's redaction pattern, even though a red
`BE-11 open — redaction not live` card should also be drawn noting the backend doesn't
actually redact these fields yet at any scope — draw the *intended* state, not today's
gap.

### PROC-08 — Reimbursement Queue
View-only list, client-filtered to `paymentMethod=PERSONAL_REIMBURSABLE &&
reimbursementStatus=PENDING` (callout: no API filter exists for this, won't paginate
correctly at scale). Card per record: "Owed to {name}", Realisasi id + purchased date,
amount, Pending chip. Info card: view-only, no mark-reimbursed endpoint exists — the debt
can be shown but never cleared here. **Do not draw a "mark as reimbursed" button** — it
would be an orphan action, no backing endpoint anywhere in the backend. Callout:
`reimbursedTo`/`reimbursedAt` exist on the entity but aren't on the response DTO — even
after paying outside Operion, the app couldn't show when or by whom. Inherits Realisasi's
cost redaction below Owner scope.

---

## Gates (run once at the end, across all 8, per the original brief's own methodology)

1. **Orphan check** — every screen still has ≥1 entry point (PROC-06/08 remain flagged as
   "not concretely identified within this module," same as the original sweep — not a
   redraw regression).
2. **Dead-end check** — unchanged from the original sweep's findings.
3. **Segregation-of-duties** — PROC-04 (PRA approver ≠ Realisasi creator, Owner/Principal
   exempt), PROC-05 Realisasi path (receiver ≠ creator, no exemption), PROC-05 PO path (no
   rule exists at all) — all three should read visually distinct from each other, not as
   one generic "there's a rule" callout.
4. **Cost visibility** — re-confirm PROC-07 is the one screen drawn against the *intended*
   redaction rather than current backend behavior; every other cost screen (PROC-03/04/08)
   draws what the API actually returns today (already redacted).
5. **Deferred-decision log** — carry forward the original 10-item log from
   `SESSION_BRIEF_B`; add an 11th if this redraw surfaces anything new structurally (e.g.
   PROC-04's split into 3 steps, once drawn, may reveal a step-navigation edge case the
   flat single-frame version didn't have to answer).

Report back when done: which screens redrew cleanly, which (if any) needed a stop-and-
report on missing information, and the consolidated gate findings — same shape as
`SESSION_BRIEF_B`'s own closing section.

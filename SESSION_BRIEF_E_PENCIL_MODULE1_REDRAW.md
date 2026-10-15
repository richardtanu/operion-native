# Session Brief E — Module 1 Procurement: Pencil Redraw Against the Real Design System

**Send to:** the Claude Code session in the editor window that has `operion.pen` open live
(Pencil MCP tools — `get_app_state`, `get_guidelines`, `execute` — only work from that
session; a background/headless session cannot reach them at all. Confirmed this session:
`get_app_state` errored "a file needs to be open in the editor" with no `.pen` file open
here.)

**Status:** Not started. Revised 15 Oct 2026 (see "Revision 2" below). This is a full
handoff, not a continuation — read everything below before touching `operion.pen`.

---

## Revision 2 — 15 Oct 2026: what changed since this brief was written

The backend shipped BE-07, BE-08, BE-11, BE-12 and BE-13, and the app was updated to match
(commits `ef1dcfe2` … `af1ef413` on `feature/module1-procurement-screens`). The app is now
ahead of `operion.pen`. Do the work in this order:

1. **The redraw this brief always described** (token swap, kit, PROC-01…08), with the
   per-screen amendments marked **[Rev 2]** below.
2. **Three screens that exist in the app but not in the design** — see "New screens".
3. **The theme panel** — see "Tenant theme panel".

**Checked state of the file on 15 Oct:** the desktop PROC-01…08 frames and every kit
component already bind to `$` variables (no raw hex). The board "Mobile Wireframes —
Procurement (React Native)" does not: it has 312 raw hex fills/strokes from the old
placeholder palette (`#8A8D82`, `#585F64`, `#A9A692`, `#A05F1B`, `#305D82`, …). Rebind
every one of them to the matching variable. No raw hex should remain on that board.

### Decision: the design stays in the Default theme

The app now has two themes, picked at runtime from the tenant (`theme/ThemeContext.tsx`):
**Default** (the light "range safety board" in this brief) and **Tactical Green** (used by
tenant `BLITZ_BDG`, and always on the login screen). The product owner decided the design
file stays in **Default** everywhere. **Do not** recolour screens and **do not** add theme
modes to the existing variables. Tactical Green appears in exactly one place: the theme
panel described at the end of this brief.

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
**[Rev 2] Both callouts above are now false — replace them:**
- The create button is **Gated, badge `MANAGER+`** (BE-13: create and cancel need MANAGER
  scope or above, 403 otherwise). Draw a second state of the button: disabled, with a
  warning callout "Your scope can't create authorizations — it needs Manager or above."
- Notification callout becomes **neutral tone**: "Creating this notifies the PROCUREMENT
  users in this branch, so purchasing knows they can buy. The request's requester is told
  it was authorized." (BE-07)
- Cost callout: purchased and remaining **value** are Owner+-only (null below), but
  **max value stays visible at every scope** — draw max value as a normal value, and
  purchased/remaining value with the `Redacted Value` treatment for a sub-Owner viewer.

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
**[Rev 2]** While superseding, the form shows a required **"Reason for correction"** edit
field above the "Save correction" button (the API rejects a supersede without one). The
desktop frame's "wrong shipping cost entered" already shows this reason; carry it into the
mobile column. Purchased-at stays a `YYYY-MM-DD` field — the app sends it as a datetime.

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
**[Rev 2]** PROC-05 is now **two screens**: the receive form above, and a **Goods Receipts
list** that is the menu's entry point (see "New screens"). On the form, add a derived
field "Received by: you (current user)" — the API requires the receiver and the app sends
the signed-in user. The "no notification on receipt" callout is still true; keep it.

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
**[Rev 2] BE-11 shipped — the server now returns `totalAmount` and `price` as null below
Owner.** Delete the red "BE-11 open" card, and on the mobile column delete the note
"Unlike every other cost screen here, this redaction isn't live yet…". Below Owner, each
line shows "Price hidden below Owner scope" and there is no Total card. **Remove any
"Order date" input** — the server sets it to today on create and the request has no field
for it. Show it on the created PO as a derived KV row "Order date".

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

## New screens [Rev 2]

Draw each as a new column on the mobile board, after PROC-08, in the same device frame and
kit. The app code is the content spec — read the file named on each before drawing.

### PROC-05 list — Goods Receipts
File: `app/(app)/goods-receipts/index.tsx`. The menu's PROC-05 entry opens this.
- Title "Goods Receipts", then a Primary button "Receive goods" (opens the form).
- Filter row of three toggle buttons: All · By realisasi · By purchase order (selected =
  Primary, others = Secondary). The filter is sent to the server.
- One Card per receipt, newest first: record reference in mono (PO number, or the
  Realisasi's external order ref) with an outline Chip "PO" or "Realisasi" on the right;
  helper line "received 14/10/2026 by {name}"; one KV per item "{part} · {qty} (stock
  units)"; notes in mute if present.
- Empty state: "No goods receipts yet."

### PROC-09 — Procurement Activity Log
File: `app/(app)/procurement/activity.tsx`. HQ's accountability view (BE-07): every status
change on PRs, PRAs, Realisasi and POs across the caller's branches. Read-only.
- **Entry point:** a **Gated** button at the bottom of the Procurement menu, "PROC-09 ·
  Activity log", badge `ADMIN·PROC·OWNER+`. Draw it enabled, and disabled for a user
  without access.
- Header: title "Activity Log", helper "Every status change on requests, authorizations,
  purchases and orders across your branches. Newest first."
- Two filter rows of toggle buttons: record type `All · PR · PRA · Realisasi · PO`, then
  period `7 days · 30 days · 90 days · All` (default 30 days).
- Grouped by day under a `Section` label: "TODAY", "YESTERDAY", then "12 OCT 2026".
- **Entry card**, three lines:
  1. time in mono steel `14:32` · outline Chip with the record type (`PR`, `PRA`,
     `REALISASI`, `PO`) · reference in mono ink (PO number or external order ref, else a
     short id `#8ca7fca9`).
  2. the change: previous-status Chip (outline) → arrow-right icon → new-status Chip
     (**solid**, the loudest thing on the card). A creation has no previous status: helper
     text "Created as" before the solid chip.
  3. actor name in body ink · "· {branch name}" in mute. **No actor** (a system-derived
     change, or a row written before actors were recorded) = lock icon + italic steel
     "System" — the derived-field treatment, never a blank.
  Optional fourth line: the reason in steel, in quotes.
- Status chip tones, the same for all four record types: APPROVED, AUTHORIZED,
  FULFILLED, RECEIVED = success · REJECTED, FAILED, CANCELLED = danger · PENDING,
  PENDING_APPROVAL, ESCALATED, PARTIALLY_FULFILLED, PARTIALLY_RECEIVED = pending ·
  anything else (DRAFT, ORDERED, ACTIVE, SUPERSEDED) = neutral.
- Draw one card **expanded** (tapping toggles it): KV rows Record ID (full UUID, mono),
  When, Branch, and — when there is no actor — a derived KV "Changed by: System or pre-log
  change".
- Footer: Secondary button "Load more" (100 per load, up to the server cap of 500). At
  500, a neutral Callout: "Showing the newest 500 changes, the most one load can return.
  Pick a shorter period or a record type to see older ones."
- Two extra states, drawn small beside the main frame: **no access** (title + warning
  Callout "Not available for your account — The activity log is for ADMIN or PROCUREMENT
  users, or Owner scope and above."), and **empty** ("No changes in this period.").
- Sample content to draw with (real shapes from the local backend): a PO `DRAFT → ORDERED`
  by a named user with a reason; a PRA `ACTIVE → FULFILLED` with no actor (System); a PR
  "Created as PENDING"; a Realisasi `PENDING_APPROVAL → APPROVED`.

### Notifications
File: `app/(app)/notifications/index.tsx`. The user's own inbox, opened from the
Dashboard.
- **Entry point:** a Secondary button on the Dashboard, "Notifications · 3 unread" (just
  "Notifications" when there are none).
- Header row: title "Notifications" left, mono steel "3 unread" right. Below it a Secondary
  button "Mark all read", disabled when nothing is unread.
- One Card per notification, newest first. Line 1: type label in the chip type style
  (e.g. "REQUEST APPROVED", "READY TO BUY", "NEEDS APPROVAL", "LOW STOCK") and the time
  right-aligned in mono mute ("Today 14:32"). Then the title (card title style) and the
  message (body).
- **Unread** = a small square dot in `info` before the type label, the type label in
  `info`, title in ink. **Read** = no dot, everything one step quieter (type label mute,
  title steel, message mute). Unread never uses `tag` yellow — that colour is only for
  scope gates.
- Draw at least one unread and one read card. Empty state: "Nothing yet. You're told when
  your requests move and when you can buy."
- Type labels: NEW_PURCHASE_REQUEST "New request" · PURCHASE_REQUEST_ORDERED "Request
  ordered" · PURCHASE_REQUEST_APPROVED "Request approved" · PURCHASE_REQUEST_REJECTED
  "Request rejected" · PURCHASE_REQUEST_AUTHORIZED "Request authorized" ·
  PURCHASE_AUTHORIZATION_CREATED "Ready to buy" · REALISASI_ESCALATED "Needs approval" ·
  LOW_STOCK "Low stock" · PART_END_OF_LIFE "Part end of life".

---

## Tenant theme panel [Rev 2]

One new frame, placed next to the kit components, named **"Theme — Tactical Green
(BLITZ_BDG)"**. Its job: show what the buttons become for a tenant on the Tactical Green
theme, without recolouring any screen. Everything else in the file stays Default.

**Variables:** add these as **separate** colour variables with a `tg-` prefix. Do not
turn them into theme modes of the existing variables, and use them **only** inside this
panel. Values are exact copies of `theme/themes/tacticalGreen.ts`:

| Variable | Value | Role |
|---|---|---|
| `tg-surface` | `#081410` | screen body (the panel's background) |
| `tg-panel` | `#0C1F17` | cards |
| `tg-ink` | `#8CFFB0` | primary text, Primary button fill, glow colour |
| `tg-steel` | `#5FA37B` | secondary text |
| `tg-mute` | `#3F6E55` | labels, disabled text |
| `tg-line` | `#2C5B3F` | Secondary border, disabled fill |
| `tg-tag` | `#FFB238` | Gated border and glow |
| `tg-warn` | `#FFB24D` | the gate badge text (`OWNER+`) |

**Layout:** two columns side by side, **Default** on the left, **Tactical Green** on the
right, each on its own theme's surface colour, so the difference reads at a glance. Each
column has the same rows, drawn from the kit's Button components (instances with
overridden colours on the right — not new components):

| Row | Default | Tactical Green |
|---|---|---|
| Primary | fill `$ink`, label `$panel` | fill `$tg-ink`, label `$tg-panel`, **glow**: drop shadow `#8CFFB0`, 0 offset, blur 10, opacity 0.8 |
| Secondary | no fill, 1.5px `$line` border, label `$ink` | no fill, 1.5px `$tg-line` border, label `$tg-ink`, no glow |
| Gated (badge `OWNER+`) | no fill, 2px `$tag` border, label `$ink`, badge `$warn` | no fill, 2px `$tg-tag` border, label `$tg-ink`, badge `$tg-warn`, **glow** `#FFB238`, blur 10, opacity 0.8 |
| Disabled | fill `$line`, label `$panel`, no glow | fill `$tg-line`, label `$tg-panel`, no glow |

Everything not listed — radius 2, label font Barlow Condensed bold 17 uppercase,
letter-spacing 0.85, 12px vertical / 14px horizontal padding, badge IBM Plex Mono 10 —
is identical in both columns: the theme is a palette and glow swap, not a new visual
system.

Under the columns, a neutral Callout: "Screens in this file are drawn in the Default
theme. Tenants on Tactical Green (today: BLITZ_BDG, plus the login screen for everyone)
get these colours at runtime from `theme/themes/tacticalGreen.ts`. The roles don't
change: the gate colour still marks only scope-gated actions."

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
4. **Cost visibility** — **[Rev 2]** since BE-11 every cost screen (PROC-03/04/07/08) draws
   what the API actually returns: cost fields null below Owner. PROC-03's max value is
   the one money figure visible at every scope.
5. **Deferred-decision log** — carry forward the original 10-item log from
   `SESSION_BRIEF_B`; add an 11th if this redraw surfaces anything new structurally (e.g.
   PROC-04's split into 3 steps, once drawn, may reveal a step-navigation edge case the
   flat single-frame version didn't have to answer).

6. **[Rev 2] Raw colour check** — the mobile board has no raw hex left; the only `tg-`
   variables in the file are inside the theme panel.
7. **[Rev 2] Gate colour check** — across all 11 screens, the `tag` border appears only
   on actions the server actually gates: PROC-02 approve/reject (OWNER+), PROC-03 create
   (MANAGER+), PROC-04 approve (OWNER+), and the PROC-09 menu entry.

Report back when done: which screens redrew cleanly, which (if any) needed a stop-and-
report on missing information, and the consolidated gate findings — same shape as
`SESSION_BRIEF_B`'s own closing section.

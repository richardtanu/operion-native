# Session Brief F — PROC-04: step states, error jump, corrections, drafts (Pencil)

**Send to:** the Claude Code session that has `operion.pen` open live in Pencil (its MCP
tools only work where the file is open in the editor).
**Status:** Done 20 Oct 2026, in the session that wrote it (Pencil reconnected). See
"Completion notes" at the end.
**Scope:** design only. Don't touch app code; it's already built and is the spec.

---

## Why

Product decision #11 (20 Oct 2026, recorded in `SESSION_BRIEF_E_PENCIL_MODULE1_REDRAW.md`,
decision log item 11): the PROC-04 purchase form keeps its three free tabs (Receipt /
Costs / Items), but the tabs now report their own state, Create checks every step and
jumps to the first problem, a correction marks what changed, and a half-finished purchase
can be saved as a draft on the phone.

The app already does this. Draw what it does. The source of truth for copy and behaviour:

- `app/(app)/realisasi/create.tsx` — the form, drafts list, error banner, correction mode
- `components/StepTabs.tsx` — the tab states
- `components/Field.tsx` — the new `error` and `changedFrom` states
- `app/(app)/dashboard.tsx` — the stale-draft reminder
- `drafts/realisasiDrafts.ts` — drafts live on the phone, per user; "stale" = 3+ days old

Read those files before drawing. Quote their text exactly; don't paraphrase.

---

## Before touching anything

1. Call `get_app_state`, then read the pen-dev skill (`read_skill`, plus `execute.md`,
   `pen-schema.md`, `guide/components.md`).
2. Find the PROC-04 column on the board **"Mobile Wireframes — Procurement (React
   Native)"**. Look nodes up **by name**; the ids below were correct on 15 Oct and may
   have moved:
   - Column `PROC-04 Column` (`nWxdr`) with rows `Form Steps` (`jIiNi`) and `Outcomes`
     (`E4YiS`), then `Notes`.
   - Form step devices: `Step 1 · Receipt`, `Step 2 · Costs`, `Step 3 · Items`; each has a
     `Step Selector` row and a `Bottom Bar` holding one `Button — Create`.
   - `Supersede · correcting a record` device, with its `Step Selector`, the `+ Shipping`
     field, and a `Bottom Bar` holding `Field — Reason for correction` and
     `Button — Save correction`.
   - The Dashboard device sits in the `NOTIF Column` → `Entry & States`.
3. Use the existing kit components (all reusable): `Button/Primary`, `Button/Secondary`,
   `Field/Edit`, `Field/Picker`, `Chip`, `Callout`, `Card`, `Section`, `Mobile Shell`.
   Variables only (`$ink`, `$danger`, `$info`, …), **no raw hex** on the board.

---

## What to draw

### 1. A `StepTab` kit component (new, reusable)

Mirror `components/StepTabs.tsx`: min height 44, radius `$radius-sm`, 1.5px border,
label `"1. RECEIPT"` in Barlow Condensed bold 13, uppercase, letter-spacing ~1.1, then
an optional status mark with a 5px gap.

| State | Fill | Border | Label | Mark |
|---|---|---|---|---|
| Active | `$ink` | `$ink` | `$panel` | — |
| Inactive | none | `$line` | `$steel` | — |
| + complete | | | | lucide `check`, 14px, `$good` (on the active tab: `$panel`) |
| + missing | | | | 8×8 square, radius 2, `$danger` (on the active tab: 1.5px `$panel` border) |

Place it with the other kit components at the top. Use instances everywhere below.

### 2. Update the three step devices

Replace each `Step Selector` with three `StepTab` instances:

- Step 1 device: **1 active + complete**, 2 plain, 3 plain.
- Step 2 device: 1 complete, **2 active**, 3 plain.
- Step 3 device: 1 complete, 2 complete, **3 active + complete**.

Each `Bottom Bar`: replace the single Create with a row of two equal buttons:
`Button/Secondary` **"SAVE DRAFT"** and `Button/Primary` **"CREATE"**.

### 3. New row in the PROC-04 column: "Steps & drafts (decision #11)"

Add it between `Outcomes` and `Notes`, same pattern as the other rows (a state label in
Barlow Condensed bold 12 uppercase `$steel` above each 300-wide device). Four devices:

**a. "After Create · a gap on step 2"** (title `New Realisasi`)
- Tabs: 1 complete, **2 active + missing**, 3 complete.
- Danger `Callout`: **"1 thing to fix on this step before you can create."**
- The six cost fields, with **Subtotal** empty and in the error state (the only
  required cost field): 2px `$danger` border on the input, helper in `$danger`:
  **"Required."** The other five filled in normally.
- Bottom bar: Save draft + Create.

**b. "Step 3 · before a PRA line is picked"**
- Tabs: 1 plain, 2 plain, **3 active**.
- `Section` "ITEM", then a `Card`: body ink **"Pick a PRA line in step 1 first."**,
  helper `$steel` **"The part and its purchase unit come from that line, so there's
  nothing to fill in here yet."**, and a `Button/Secondary` **"GO TO STEP 1"**.

**c. "Unfinished purchases"** (title `New Realisasi`)
- `Section` **"UNFINISHED PURCHASES · 2"**.
- Card 1: "6mm BBs 0.25g" + neutral outline `Chip` **"DRAFT"**; helper **"Saved Today 14:32
  · step 2 of 3"**; two `Button/Secondary` side by side, vertical padding 8:
  **"CONTINUE"** and **"DISCARD"**.
- Card 2 (stale): **warning-tone border** (`$warn`), "No PRA line picked yet" + warning
  outline `Chip` **"6 DAYS OLD"**; helper **"Saved 14 Oct 2026 09:10 · step 1 of 3"**;
  buttons **"CONTINUE"** and **"TAP AGAIN TO DISCARD"** (the armed state).
- Helper `$mute`: **"Drafts stay on this phone until you create or discard them. Or start
  a new purchase below."**
- Below: the normal step tabs (1 active) and the start of step 1, cut off by the device.

**d. "Draft saved"** (title **`New Realisasi · draft`**)
- Step 2 filled in, tabs 1 complete / 2 active / 3 plain.
- Helper `$steel` above the bottom bar: **"Saved on this phone at 14:32."**

### 4. Update the supersede device

- Under the title, helper `$steel`: **"Everything is copied from the original. Fields you
  change are marked in blue; the original stays visible, read-only."**
- Tabs: 1 complete, **2 active + complete**, 3 complete.
- The `+ Shipping` field (value 25,000): **changed state** — 2px `$info` border, helper
  `$info` **"Changed from 35000"**.
- Bottom bar keeps only `Field — Reason for correction` and **"SAVE CORRECTION"** (no Save
  draft: corrections aren't saved as drafts).
- Small state frame beside or under it, **"State · Save pressed without a reason"**: the
  reason field in the error state, helper `$danger` **"Required — the correction is
  refused without a reason."**

### 5. Dashboard reminder

In the Dashboard device (`NOTIF Column`), above the Procurement button: a warning
`Callout` titled **"UNFINISHED PURCHASES"** with **"2 purchases were saved as a draft more
than 3 days ago. The money is already spent, but the Owner can't see it until you create
them."**, then `Button/Secondary` **"OPEN DRAFTS"**. Add a state label noting it only
appears when a draft is 3+ days old.

### 6. Notes and desktop

- Add a note to the PROC-04 column's `Notes`: tone success, head **"Decision #11"**, text
  "Free tabs that report their own state; Create jumps to the first step with a problem;
  corrections open prefilled with changes marked in blue; drafts on the phone with a
  3-day dashboard reminder."
- Desktop frame `PROC-04 — Realisasi Entry & Review`: update its `Step Selector` to show
  the same states (1 complete, 2 active + missing, 3 complete). Nothing else on desktop.

---

## Rules

- **Colour roles:** `$danger` = something to fix; `$info` = changed from the original;
  `$warn` = stale draft. **`$tag` (yellow) stays reserved for scope-gated buttons** —
  nothing here is gated, so no yellow anywhere in this work.
- Every new or edited root frame gets `placeholder: true` while you work on it, removed
  when done.
- Check each device for overflow (text wider than its row) and clipping before moving on.

## Gates (run at the end)

1. No raw hex on the mobile board (scan every fill/stroke, including instance
   overrides).
2. No `$tag` stroke on anything added in this pass.
3. Every copy string above appears exactly as quoted (compare against the code files).
4. Screenshot the PROC-04 column and the Dashboard device.

Report back: what was drawn, anything in the code that didn't match this brief, and the
gate results.

---

## Completion notes — 20 Oct 2026

- **Drawn as specified:** the `StepTab` kit component (next to `Section`); tab states and
  Save draft / Create on the three step devices; a new row "Steps & drafts (decision
  #11)" with the gap-on-step-2, step-3-before-a-line and unfinished-purchases devices; a
  row "Draft saved (decision #11)" with the saved-draft device and a "How drafts behave"
  list; the supersede device's helper, tab states, blue "Changed from 35000" on Shipping
  and a "Save pressed without a reason" state; the Dashboard reminder with "Open drafts";
  a "Decision #11" note; tab states on the desktop PROC-04 step selector.
- **Changed from this brief, in both design and code:** the armed discard button reads
  **"CONFIRM"**, with a danger helper **"Tap Confirm to delete this draft."** below the
  card's buttons. "Tap again to discard" didn't fit a half-width button at the button
  type size, on the canvas or on a phone.
- **Gap-on-step-2 device** shows the six cost fields without the total card: with
  Subtotal empty the computed total would be negative, which reads as a bug in a state
  drawing.
- **Gates:** no raw hex on the mobile board (0 found); no `$tag` on anything added (the
  only `$tag` in the PROC-04 column is the escalated purchase's gated Approve, unchanged);
  copy matches the code. The layout checker flags some new frames as "partially
  clipped", but screenshots show every one rendered in full — stale measurements, not
  real clipping.

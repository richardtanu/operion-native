# Session Brief G — People, Change password, Store settings, Cashflow (Pencil)

**Send to:** the AI chat in the Pencil tab that has `operion.pen` open.
**Written:** 2 Nov 2026.
**Scope:** design only. The app is already built (pull request #6, branch
`feature/be-29-41-catch-up`) and is the spec. Don't change app code.

---

## Why

On 30 Oct the backend shipped BE-29 and BE-31 to BE-41. The app followed on 2 Nov with
five new screens and changes to five existing ones. Usually a screen is drawn in
`operion.pen` before it's built. This time they were built first, so the design file is
now behind the app.

Draw what the app does. Every quoted string below is copied from the app. Use it
exactly: don't reword it, and don't invent other copy. If you can read the repo,
the source files are listed at the end.

---

## Before drawing

1. Look at the file first. Find these by **name**; ids may have moved:
   - Board **"Mobile Wireframes — Procurement (React Native)"** (was `dLtA7`), with one row
     of screen columns. The last one is **"PROC-10 Column"** (was `rIH1w`).
   - Board **"Mobile Wireframes — Inventory (React Native)"** (was `I4gWI4`), with row
     **"Inventory Screens Row"** (was `WRP4p`), columns INV-01 to INV-09.
   - The components frame: `Mobile Shell`, `Button/Primary`, `Button/Secondary`,
     `Button/Gated`, `Field/Edit`, `Field/Derived`, `Field/Picker`, `Chip`, `Callout`,
     `Section`, `Card`, `KV`.
2. Copy the way an existing column is built, for example PROC-10. Each column has:
   - a header: code, title, one-line purpose
   - one or more phone frames, each a `Mobile Shell` instance with a short label above it
     ("Store Owner", "Read only"…)
   - a Notes block underneath: short titled notes, each with a tone
3. Reuse the components. Don't draw a new kind of button, field, chip or card.

## House rules (same as the rest of the file)

- **Default (light) theme only.** Bind every colour to a `$` variable; no raw hex.
- **Hazard yellow means a permission check.** Use `Button/Gated` only for an action the
  server checks, with its gate text exactly as given below (e.g. `ADMIN·STORE OWNER`).
  Everything else is `Button/Primary` or `Button/Secondary`.
- **Two buttons side by side as a choice** (Switched on / Switched off, Paid from):
  draw them as a `Button/Primary` (the picked one) next to a `Button/Secondary`, both
  full width in a row with no gap. Expenses (PROC-10) already does this for "Paid by".
- **Mono type** (IBM Plex Mono) for anything read aloud or typed exactly: amounts,
  emails, numbers in settings fields, order references.
- Amounts are written `Rp 1.200.000`: Indonesian grouping, with dots.
- Section labels are the `Section` component, which writes them in upper case.
- Known limits of the file, same as before: no dashed borders, no tinted callout
  backgrounds.

## Sample people and data

Use the same people on every screen, so the screens read as one store:

| Person | Email | Role | Scope | Notes |
|---|---|---|---|---|
| Budi Santoso | budi@blitz.id | Operator | Owner | the signed-in store Owner ("you") |
| Rina Wijaya | rina@blitz.id | Operator | Manager | the Store Manager |
| Andi Pratama | andi@blitz.id | Technician | (none) | just added, must change password |
| Agus Setiawan | agus@blitz.id | Admin | Owner | an Admin: read-only for a store Owner |
| Dewi Lestari | dewi@blitz.id | Operator | Supervisor | switched off |

The store is **Outlet Bandung** (`BLITZ_BDG`). HQ is **HQ BANDUNG**. Today is
**2 Nov 2026**.

---

# Part A — new screens

## A1. New board: "Mobile Wireframes — Settings (React Native)"

Put it directly below the Inventory board, with the same width, padding, title and
subtitle style, and the same flags strip if that board has one.

- Title: **Mobile Wireframes — Settings (React Native)**
- Subtitle: **People, passwords and store settings · BE-31 to BE-38 · built 2 Nov 2026,
  pull request #6**

One row of five columns: ACC-01 to ACC-05. The codes are new: the app has no screen
codes for these yet. Add a note on the board saying so.

### ACC-01 — People

Header: **ACC-01 · People** — "Who works at the store, and what they may do. An Admin sees
their tree; a store's Owner sees their own store."

**Phone 1, "Store Owner":**
- Title: `People`
- `Button/Gated` **Add a person**, gate `ADMIN·STORE OWNER`
- Choice row: **Switched on** (picked) | **Switched off**
- A list of cards, one per person, in name order:
  - **Agus Setiawan**. Small text: `agus@blitz.id`. Right of the name: Chip `Read only`.
    Chips: `Admin` · `Owner`.
  - **Andi Pratama**. `andi@blitz.id`. Chips: `Technician` · `No scope` (pending tone) ·
    `Must change password` (warning tone).
  - **Budi Santoso (you)**. `budi@blitz.id`. Chip `Read only`. Chips: `Operator` · `Owner`.
  - **Rina Wijaya**. `rina@blitz.id`. Chips: `Operator` · `Manager`.

**Phone 2, "Switched off tab":**
- The same top, with **Switched off** picked.
- One card: **Dewi Lestari**, in the muted text colour. `dewi@blitz.id`. Chips:
  `Operator` · `Supervisor` · `Switched off` (danger tone). Below the chips, small text:
  `By Budi Santoso: Left the company on 31 Oct`

**Phone 3, "HQ Admin":**
- The same top, plus a `Field/Picker` labelled **Store**, value `Every store`, above
  the choice row.
- Each card's small text starts with the store: `Outlet Bandung · rina@blitz.id`.

**States to show small, beside the phones:**
- Empty: `Nobody here yet.` / `Nobody is switched off.`
- Not allowed (anyone below Owner who isn't an Admin): a warning Callout:
  `Only an Admin or the store’s Owner manages people.`

**Notes:**
- "Tapping a card opens ACC-02."
- "Read only: yourself, and, for a store Owner, the store's Owners and Admins. HQ manages
  those."
- "Built 2 Nov (BE-33, BE-34); drawn after the build."

### ACC-02 — Person

Header: **ACC-02 · Person** — "One person: scope, role, password, switch off."

**Phone 1, "Owner editing the Store Manager":**
- Title: `Rina Wijaya`
- Card with KV rows: `Email` rina@blitz.id · `Store` Outlet Bandung · `Role` Operator ·
  `Scope` Manager (strong). Below them, Chip `Switched on` (success tone).
- Success Callout: `Scope is now Manager. It applies from their next sign-in.`
- Section `Scope`: a `Field/Picker` showing `Manager` (it offers only Supervisor and
  Manager). `Button/Gated` **Save scope**, gate `ADMIN·STORE OWNER`, disabled.
- Section `Role`: a `Field/Picker` showing `Operator`. `Button/Gated` **Save role**,
  gate `ADMIN·STORE OWNER`, disabled.
- Section `Password`: a `Field/Edit` labelled **Temporary password**, empty and
  password-masked, with the help text `8 to 72 characters. Tell them in person; they
  must change it at their next sign-in, and any sign-in they still have ends.` Then
  `Button/Gated` **Reset password**, gate `ADMIN·STORE OWNER`, disabled.
- Section `Switch off`: a `Field/Edit` labelled **Reason (required)**, placeholder
  `e.g. left the company on 31 Oct`, help text `They’re signed out at once and get no
  alerts. Their history stays, and anything owed to them is still paid back.` Then
  `Button/Gated` **Switch off**, gate `ADMIN·STORE OWNER`, disabled.

**Phone 2, "Read only":** the Owner opens Agus Setiawan.
- Title `Agus Setiawan`, then the same card: `Email` agus@blitz.id · `Store` Outlet
  Bandung · `Role` Admin · `Scope` Owner · Chip `Switched on`.
- A neutral Callout: `Only HQ manages a store’s Owners and Admins.`
- Nothing else: no sections, no buttons.

**Phone 3, "Switched off person":** the Owner opens Dewi Lestari.
- The card shows Chip `Switched off` (danger tone). Under it, small text:
  `Switched off 31 Oct 2026 by Budi Santoso: Left the company on 31 Oct`
- The Scope, Role and Password sections as on phone 1.
- Section `Switch on`, with `Button/Gated` **Switch back on**, gate `ADMIN·STORE OWNER`.

**States to show small:**
- Yourself: Callout `This is you. Nobody changes their own scope, role or switch; change
  your own password from the dashboard.` Under it, `Button/Secondary`
  **Change your password**.
- An Admin with no scope, under Section `Scope`: small muted text
  `You have no scope yourself, so you can’t grant one. HQ’s super admin grants scopes.`
- Error: a danger Callout with the server's message, e.g.
  `Owners give Supervisor or Manager only; HQ gives Owner`.

**Notes:**
- "Scope choices: an Admin up to their own scope (BE-31); a store Owner Supervisor or
  Manager (BE-34)."
- "Role choices: an Admin any; a store Owner any but Admin."
- "A new scope or role applies from the person's next sign-in, because the sign-in
  carries them."

### ACC-03 — Add a person

Header: **ACC-03 · Add a person** — "A new person starts as an Operator with no scope and
chooses their own password at first sign-in."

**Phone 1, "Store Owner":**
- Title: `Add a person`
- Small text: `Joins Outlet Bandung.`
- `Field/Edit` **Full name**, placeholder `e.g. Rina Wijaya`
- `Field/Edit` **Email**, placeholder `rina@example.com`
- `Field/Edit` **First password**, masked, help text `8 to 72 characters. They must
  change it at their first sign-in.`
- Neutral Callout: `You add people to your own store. HQ adds a store’s Owners and
  Admins.`
- `Button/Gated` **Add person**, gate `ADMIN·STORE OWNER`

**Phone 2, "Added":**
- Heading: `Person added`
- Card with KV rows: `Name` Andi Pratama · `Email` andi@blitz.id · `Store` Outlet
  Bandung · `Starts as` Operator, no scope
- Body text: `Give them a scope and a role next. Tell them the first password in person;
  they choose their own at their first sign-in.`
- `Button/Primary` **Open Andi Pratama**
- `Button/Secondary` **Add another**

**State to show small, "HQ Admin":** in place of "Joins Outlet Bandung.", a
`Field/Picker` labelled **Store** with the store's name. There's no Callout for an Admin.

### ACC-04 — Change password

Header: **ACC-04 · Change password** — "Your own password. After a reset it comes first,
before any other screen."

**Phone 1, "From the dashboard":**
- Title: `Change password`
- `Field/Edit` **Current password** (masked)
- `Field/Edit` **New password** (masked), help text `8 to 72 characters.`
- `Field/Edit` **New password again** (masked)
- `Button/Primary` **Change password**
- `Button/Secondary` **Cancel**

**Phone 2, "Forced after a reset":**
- Title: `Change password`
- Warning Callout titled **Choose your own password**:
  `Someone else set your current password. Choose your own before you go on.`
- The same three fields and `Button/Primary` **Change password**
- `Button/Secondary` **Sign out** (in place of Cancel). There's no way back from here.

**Phone 3, "Done":**
- Heading: `Password changed`
- Body: `This phone stays signed in. Anywhere else you were signed in has been signed out.`
- `Button/Primary` **Back**

**States to show small:**
- Errors (danger Callout): `The two new passwords don’t match.` and, from the server,
  `Your current password is wrong`
- **The sign-in screen**, when someone was signed out with a reason: a warning Callout
  above the Sign in button that reads `This account is switched off.` or
  `Your password was changed; sign in again.` Without a reason it stays
  `Your session expired. Sign in again to continue.`

**Notes:**
- "A wrong current password keeps you signed in (BE-32)."
- "Changing it signs out every other phone; this one gets a fresh sign-in (BE-36)."

### ACC-05 — Store settings

Header: **ACC-05 · Store settings** — "The store's targets for stock and maintenance. The
store's Owner changes them; everyone else, HQ included, reads them."

**Phone 1, "Store Owner":** this one is long; let the phone frame grow, or split it in
two phones labelled "top" and "bottom".
- Title: `Store settings`
- Neutral Callout: `Outlet Bandung hasn’t saved its own settings, so these are the
  defaults.`
- Section `Stock`, then a `Field/Edit` for each row below. Values in mono, help text under
  each:

  | Label | Value | Help text |
  |---|---|---|
  | Target days of stock | 14 | An item is low when it runs out sooner than this. |
  | Usage window (days) | 30 | How far back usage is averaged. |
  | Usage needs at least (days) | 21 | Days of history before usage counts. Not more than the window. |
  | Usage needs at least (uses) | 10 | Times an item was used before its usage counts. |

- Section `Maintenance`, the same way:

  | Label | Value | Help text |
  |---|---|---|
  | Health needs attention below | 50 | 0 to 100. |
  | Unit goes into maintenance below | 60 | 0 to 100. |
  | Service every (days) | 90 | Since the last maintenance. |
  | Warn before a part’s end of life (days) | 30 | 0 to 365. |
  | Most worn parts on a unit | 2 | 0 to 100. |
  | Most refurbished parts on a unit | 3 | 0 to 100. |
  | Most removed parts on a unit | 5 | 0 to 100. |

- Under those, the label **Open a work order by itself** with a choice row **Yes**
  (picked) | **No**, and small muted text `When the nightly check finds a unit that needs
  work.`
- `Button/Gated` **Save settings**, gate `STORE OWNER`, disabled until a value changes.

**Phone 2, "Read only (Store Manager)":**
- Title, then the defaults Callout as above, then a neutral Callout:
  `Only the store’s Owner changes these.`
- Section `Stock`, then one `Card` of `KV` rows (label and value, no help text).
  Section `Maintenance`, then one `Card` of `KV` rows ending with
  `Open a work order by itself` Yes.
- No Save button.

**States to show small:**
- HQ: a `Field/Picker` labelled **Store** at the top, and the Callout
  `HQ reads a store’s settings; only that store’s Owner changes them.`
- A field error: the field in its error state with the text `1 to 365.`
- `Usage needs at least can’t be longer than the usage window.` in danger text under
  the Stock fields.
- After saving: success Callout `Saved. Low-stock and maintenance checks use these from
  now on.`

## A2. PROC-11 — Cashflow (on the Procurement board)

Add a new column **after PROC-10** in the Procurement board's row. Code it **PROC-11**.
The app has no code for this screen; it opens from the Procurement menu as "Cashflow".

Header: **PROC-11 · Cashflow** — "Every movement of money out of the store, on the day the
money moved. For Accounting and the store's Owner."

**Phone 1, "Owner · this month":**
- Title: `Cashflow`
- Row of two buttons: `Button/Secondary` **‹ Earlier** | `Button/Secondary`
  **Later ›** (disabled, because this is the current month)
- `Card`: small label `November 2026`, `KV` **Money out** `Rp 2.315.000` (strong),
  then small text `Money in isn’t recorded in the app yet.`
- `Section` `Today`, then one card:
  - **Purchase**. Small text: `Shopee · Toko Airsoft Jaya · INV/20261102/1234`.
    Right-aligned amount: `− Rp 480.000`. Below, Chip `Waiting for the Owner`
    (pending tone).
- `Section` `Yesterday`, then three cards:
  - **Paid back · purchase**. `Rina Wijaya · SHP-0114 · Transfer`. `− Rp 350.000`
  - **Order to HQ**. `HQ BANDUNG · PO-2026-0031`. `− Rp 1.200.000`
  - **Purchase**, the card in danger tone. `Tokopedia · Gas Station Bandung · INV/20261101/0877`.
    `− Rp 285.000`. Chip `Rejected · check for a refund` (danger tone).

**Phone 2, "HQ · every store":**
- A `Field/Picker` labelled **Store**, value `Every store`, above the month buttons.
- The same rows, but each card's small text starts with the store:
  `Outlet Bandung · Shopee · Toko Airsoft Jaya · …`

**States to show small:**
- Empty: `No money moved this month.`
- Not allowed: warning Callout `The cashflow is for Accounting and the store’s Owner.`

**Notes:**
- "Dated when the money moved. A purchase the store paid: its date. A purchase or
  expense paid with own money: the day it's paid back. A store expense: its date. An
  order to HQ: when the Owner sends it (BE-41)."
- "Waiting and rejected purchases are listed, because the money already left
  (decision #34)."
- "Money in isn't recorded yet (decision #35)."
- "Rows don't open their record yet: the app has no purchase or order detail screen."

---

# Part B — existing screens that changed

Change these where they're already drawn. Find each by its column name.

## B1. PROC-04 Buy elsewhere, step 1 (Receipt)

- **Replace** the free-text field "Payment method" with the label **Paid from** and a
  choice row: **Store’s account** | **Paid by me**. When "Paid by me" is picked, show
  small muted text under it: `The store’s Owner pays you back (PROC-08).`
- **Payment ref** now sits alone on its row.
- **Add** a photo field labelled **Receipt photos**, drawn like the photo field on
  PROC-05 and PROC-10: "Take photo" and "Choose photo" buttons, thumbnails once picked.
  Its help text depends on who paid:
  - Paid by me: `Required when you paid yourself: it’s what the Owner pays you back
    against. Only the Owner, Accounting and you see it.`
  - Store's account: `Optional when the store paid. Only the Owner, Accounting and you
    see it.`
  - Error state (shown after Create is pressed): `Add a photo of the receipt: it’s what
    you’re paid back against.`
- **Rename** "Attachment" to **Link**, with help text
  `Optional: the order page, if there is one. The receipt itself goes in Receipt photos.`
- **Remove** the Callout that began "Optional here on purpose…".
- In the **correction** state:
  - the photo field's help text reads `The original's photo stays with the correction;
    add one only if the receipt changed.`
  - if "Paid from" changed, the small info-colour text under it reads
    `Was: Store’s account`
- In the **saved** state, the first card gains the KV row `Paid` Paid by me, then an
  info-colour link `View receipt` (or `Receipt 1`, `Receipt 2`… when there are several).
- Add a Notes entry: "Since BE-40 the server refuses a purchase paid by me without a
  receipt photo."

## B2. PROC-08 Reimbursements

At the bottom of each card, add the info-colour link `View receipt`. With several photos
it reads `View receipt (1 of 2)`. Note: "The receipt the Owner pays back against
(BE-39, BE-40)."

## B3. Procurement menu (drawn with the Activity log)

- The Activity log button's gate becomes `ADMIN·PROC·ACCT·OWNER+`.
- Under it, add `Button/Gated` **Cashflow**, gate `ACCT·OWNER+`.

## B4. Dashboard (drawn with Notifications)

Between **Notifications** and **Log out**, add `Section` `Settings`, then three
`Button/Secondary`s: **People**, **Store settings** and **Change password**. Add a note:
"People shows only for an Admin or Owner+."

## B5. PROC-02 Requests, spending card

Add a small state: "Accounting". The spending card is the same, but without the
"Set a monthly budget" link. Note: "Accounting reads the spending summary since BE-41;
only the store's Owner sets the budget."

## B6. Inventory menu and INV-07 Categories

- Inventory menu: add `Button/Secondary` **Categories** after **Items**.
- Check INV-07 against what was built, and change the drawing where it differs:
  - Top small text: `One list, kept by HQ, used by every store.` For anyone who isn't
    an HQ admin, it goes on: `Ask HQ to add or change one.`
  - HQ admins get `Button/Gated` **Add category**, gate `HQ ADMIN`.
  - Each category is a card:
    - the name, with a Chip `By quantity` or `One by one` to its right
    - small text `Consumable · counted by quantity` or `Spare part · tracked one by one`
    - a line listing its types, e.g. `Green gas, Red gas`, or `No types yet.`
    - for HQ admins, `Button/Secondary` **Edit**
  - Editing a category, inside its card:
    - `Field/Edit` **Name** and **Description**
    - the label **How items are counted** with a choice row **By quantity** | **One by one**
    - under the choice, warning text when the choice changes: `This changes how every
      item in this category is counted, in every store, from now on.`
    - each type on a row: a name field, then **Rename** and **Delete**
      (`Button/Secondary`)
    - a last row: a new-type field with placeholder `New type, e.g. Green gas`, then
      **Add type**
    - `Button/Gated` **Save category**, gate `HQ ADMIN`
    - a row: **Done** (`Button/Secondary`) | **Delete category** (`Button/Gated`,
      gate `HQ ADMIN`)
    - small muted text: `A category or type that any store’s item still uses can’t be
      deleted.`

---

## When you're done

1. Screenshot each new column and each changed screen. Check that nothing is clipped,
   collapsed or overlapping. Boards must not overlap each other.
2. Search the new and changed nodes for raw hex colours; there should be none.
3. Add a "Completion notes" section at the end of this file. List what you drew, anything
   you couldn't draw, and any place the drawing differs from this brief.

## Completion notes — 2 Nov 2026

Drawn by the Claude Code session, through the Pencil tools, after Pencil reconnected.
Nothing from this brief was skipped.

**New:**
- Board **"Mobile Wireframes — Settings (React Native)"** at (925, 14974), below the
  Inventory board. It has a title, a subtitle, two flag callouts (the new codes; where
  the screens open from), and one row with columns ACC-01 to ACC-05:
  - ACC-01: 3 phones and 2 states
  - ACC-02: 3 phones and 3 states
  - ACC-03: 2 phones and 2 states
  - ACC-04: 3 phones and 2 states
  - ACC-05: 2 phones and 3 states
- **PROC-11 Cashflow** column after PROC-10 on the Procurement board (2 phones, 2 states,
  5 notes). The board grew to 6632 wide.

**Changed:**
- **PROC-04 step 1:** "Paid from" toggle and Receipt photos replace the Payment method
  field; Attachment became Link; the "Optional here on purpose…" callout is hidden. Two
  states were added to the step 1 stack (no photo after Create; paid from the store's
  account).
- **PROC-04 elsewhere:** the saved purchase gained a "Bought from / Paid / View receipt"
  card. The Supersede stack gained a "Correction · step 1, receipt" state. There's a new
  note on BE-39 and BE-40.
- **PROC-08:** "View receipt" on both owed cards, plus a note.
- **Procurement menu (PROC-09 column):** the Activity log gate is now
  `ADMIN·PROC·ACCT·OWNER+`, also on the "no access" state, with a new **Cashflow** gated
  button under it and a note.
- **Dashboards:** a Settings section on both. The store dashboard (INV-08) shows Store
  settings and Change password. The NOTIF column's dashboard shows People, Store
  settings and Change password, with a state explaining who sees People.
- **PROC-02:** a new "Accounting" state with the spending card and no budget link.
- **Inventory menu (INV-08):** Categories after Items.
- **INV-07:** redrawn to match the app. The device body now has the intro line, Add
  category, and one card per category with its counting line, its types and Edit. The
  states are the editor, "Delete, in use" (the server's message) and the store caller.
  Its BE-29 note now says shipped.

**Differences from the app:**
- In INV-07's editor, **Done** and **Delete category** are stacked; the app puts them
  side by side. The gate badge doesn't fit in half a row at phone width.
- The PROC-04 photo buttons read "Take photo" / "Choose photo", as the app does. PROC-10,
  drawn earlier, still says "From gallery".

**Checks:**
- There are no raw hex fills or strokes in the new or changed nodes.
- Screenshots of every new column and changed screen look right. Pencil's own
  measurements kept reporting "partially clipped" and a 50 px offset on the Settings
  row, but they were stale: the rendered screenshots show nothing cut off.
- Glance at the bottom of the INV-08 dashboard phone to confirm its last button isn't
  cut.

## Source files (for reference, if you can read the repo)

- `app/(app)/users/index.tsx`, `users/[userId].tsx`, `users/add.tsx` — ACC-01 to ACC-03
- `app/(app)/account/password.tsx`, `app/(auth)/login.tsx` — ACC-04
- `app/(app)/settings/store.tsx` — ACC-05
- `app/(app)/procurement/cashflow.tsx`, `procurement/index.tsx` — PROC-11, menu
- `app/(app)/realisasi/create.tsx`, `reimbursements/index.tsx` — B1, B2
- `app/(app)/dashboard.tsx`, `components/SpendingSummary.tsx` — B4, B5
- `app/(app)/inventory/index.tsx`, `inventory/categories.tsx` — B6
- `auth/permissions.ts` — who sees and may do what

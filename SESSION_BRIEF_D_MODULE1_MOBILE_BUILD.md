# Session Brief D — Module 1 (Procurement) Mobile Build

**Date:** 27 Aug 2026
**Status:** All 8 PROC screens built and wired to the real API, against a real design
system. Pencil redraw handed off separately — see `SESSION_BRIEF_E_PENCIL_MODULE1_REDRAW.md`
(this session could not reach Pencil MCP tools; see that file's own note on why).

Addendum to `SESSION_BRIEF_B_DESIGN_WIREFRAMES.md` (screen specs) and
`SESSION_BRIEF_C_PENCIL_HANDOFF.md` (original component contract / wireframes). Records
the decisions this build was handed, what shipped, and the gaps flagged along the way —
same shape as `SESSION_BRIEF_B`/`C` and the backend's own change-queue docs.

---

## Decisions this build was handed (not re-litigated here)

1. **Mobile first.** All 8 procurement screens (PROC-01…08) get built in this app
   (`operion-native`). The web console gets the feature later, copied and detailed from
   this build.
2. **PROC-05 (Goods Receipt) builds on mobile too**, despite its own spec text
   (`SESSION_BRIEF_B`) arguing for web/back-office-only ("a paperwork/reconciliation step,
   not a barcode action"). Deliberate override, not an oversight to "fix" later by
   skipping the screen.
3. **Two product decisions remain genuinely open** — not resolved by inventing a field or
   endpoint:
   - Whether PRA gets a header-level value cap (today: per-line ceilings only).
   - Whether a purchaser may mark their own reimbursement as paid (no backend endpoint
     exists for "mark reimbursed" at all, regardless of who'd be allowed to use it).
4. **Procurement writes are blocking-error, manual-retry — not outbox-queued.** Deliberate
   divergence from the scan-loop pattern `outbox/` was built for. Every procurement screen
   calls `api/procurement.ts` → `api/client.ts` directly, the same way
   `AuthContext.login()` already does.
5. **This pass builds all 8 screens together**, not one-at-a-time with a check-in between
   each (the original PROC-01-only session's own convention) — explicit scope decision for
   this session, made because a complete reference design (`base_design/`) already covers
   the whole module.

---

## What this session added: the design system

`theme/tokens.js` previously said outright "no visual design has happened yet." It's now
`base_design/tokens.js` verbatim — "range safety board": concrete grounds, Barlow
Condensed/Barlow/IBM Plex Mono type, hazard-yellow (`tag`) as the one loud signal,
near-square radii (equipment, not consumer chrome). This touched more than the procurement
screens:

- `theme/tokens.d.ts`, `tailwind.config.js` rebuilt around the new flat color/spacing/
  radius scale.
- `theme/typeStyle.ts` (new) — spreads a named `type` entry (`screenTitle`, `fieldLabel`,
  etc.) into an RN `Text` style; components pull typography from here rather than a linear
  Tailwind `fontSize` scale, since the design's type system is semantic-named, not linear.
- Fonts load via `expo-font` + `@expo-google-fonts/{barlow,barlow-condensed,ibm-plex-mono}`
  in `app/_layout.tsx`, gating first paint on `fontsLoaded` the same way splash-hide
  already gated on auth status.
- Icons: `lucide-react-native` + `react-native-svg` — matches the design reference 1:1 by
  name (ChevronRight, Lock, Check, Ban, Info, AlertTriangle), no remapping needed.
- `components/`: restyled `Button` (added `gated` variant + `gate` badge), `TextField`,
  `Chip` (filled pill → outline-by-default badge — a real visual change, not just
  recoloring), `Callout` (tone-aware), `SyncStateIndicator`. Added `Section`, `FieldLabel`,
  `Field` (edit/derived/picker), `Row`, `Card`, `KV`, `CeilingBar` — every PROC screen
  reuses these, so building them once as shared primitives was the right call.
- **Consequence, not scope creep:** swapping the old `neutral`/`brand`/`status` Tailwind
  color groups out would have silently broken `login.tsx`, `dashboard.tsx`, and
  `debug-outbox.tsx` (they referenced classes that no longer resolve to anything). All
  three got restyled to the new tokens as part of this pass so the app keeps functioning,
  not because they were in scope for "procurement screens."
- **Not ported:** the reference JSX's `ScopeToggle` component ("view as Owner+ / Below
  Owner"). In the reference it's a design-preview device for comparing both states side by
  side. The real app always knows the logged-in user's actual `scope` — a manual toggle
  would be a fake feature pretending the viewer can choose their own permissions. Real
  screens render once, for the real user.

---

## Screens built

| Screen | Route | Notes |
|---|---|---|
| PROC-01 | `purchase-requests/create.tsx` | Manual Part ID entry (no parts-browsing endpoint exists anywhere in this module — flagged in-app via Callout, not invented). |
| PROC-02 | `purchase-requests/index.tsx` | List + detail + actions collapsed onto one screen. Filter chips cover the real 6-value status enum. Approve/Reject additionally disabled client-side when the signed-in user's own `scope` isn't Owner+ (real check against real data, not a fabricated gate). |
| PROC-03 | `purchase-authorizations/create.tsx` | Multi-select of APPROVED PRs; ceiling lines; no header total; post-create view shows `CeilingBar` per line. |
| PROC-04 | `realisasi/create.tsx` | 3-step form (Receipt/Costs/Items). Supersede re-enters the same form pre-filled, submitting to `POST /{id}/supersede` instead of `POST /realisasi`. |
| PROC-05 | `goods-receipts/create.tsx` | Fetches the selected Realisasi fresh to check `attachments` before allowing submit — the DL-11 attachment gate is enforced client-side ahead of the server's own refusal, not just documented. |
| PROC-06 | `suppliers/index.tsx` | Root-tenant gating flagged, not faked (see gap below). |
| PROC-07 | `purchase-orders/create.tsx` | The one screen with a deliberate client-side cost mask (by the viewer's own `scope`) even though the backend doesn't redact these fields yet (BE-11 open) — matches the brief's explicit "draw the intended state" instruction. |
| PROC-08 | `reimbursements/index.tsx` | View-only, client-filtered. No mark-reimbursed action anywhere (orphan, confirmed absent). |

Entry point: `app/(app)/procurement/index.tsx` (new) — a menu screen linking to all 8,
replacing the single dashboard button from the PROC-01-only pass. `dashboard.tsx` links
into it.

---

## Spec gaps hit, flagged rather than guessed around

- **Part-browsing endpoint** — still doesn't exist anywhere in this module (PROC-01's
  original gap). Same manual-entry treatment used everywhere a Part picker would otherwise
  appear.
- **`CreatePurchaseRequestRequest`/`CreateRealisasiRequest`/`CreatePurchaseRequestAuthorizationRequest`
  field lists** — `SESSION_BRIEF_B` confirms these endpoints and their *response* DTOs in
  full but not every create-request body in equal detail. Request types in `api/types.ts`
  are built from each response's non-computed fields, commented as best-effort where that
  applies. If the real API rejects a request shape here, that's the signal to fix the
  type, not evidence the endpoint is wrong.
- **`StatusHistoryEntry`'s exact shape** — only the endpoints' existence is confirmed, not
  the response fields. Typed loosely (`{ id?, status?, createdAt?, [key: string]: unknown }`)
  and rendered defensively rather than asserting an unverified shape as fact.
- **PROC-06 root-tenant detection** — `UserProfileResponse` carries no tenant-hierarchy
  field, so the client has no reliable way to know "is my tenant root" before the tap. The
  form stays enabled; the server's actual refusal message is surfaced verbatim if it
  happens, rather than fabricating a client-side check.
- **Unconfirmed enums** — `channel` and `paymentMethod` (beyond the one confirmed value,
  `PERSONAL_REIMBURSABLE`) are plain text fields, not invented dropdown lists.
- **`GET /purchase-requests` filtering** — no query-parameter filtering confirmed; PROC-02
  and PROC-03 both fetch the full list and filter by status client-side, same caveat
  `SESSION_BRIEF_B` already notes for PROC-08's reimbursement filter (won't paginate
  correctly once a tenant's list is large).

---

## Verification

- `npx tsc --noEmit` — clean, after the typed-routes file (`.expo/types/router.d.ts`) was
  regenerated by booting Metro once (it only reflects routes present at the last Metro
  start, not at `tsc` time).
- Full Metro bundle for iOS (`expo start`, then `GET
  /node_modules/expo-router/entry.bundle?platform=ios`) — resolved and transformed cleanly;
  confirmed every new screen's identifying text is present in the output bundle.
- **Not verified:** interactive walkthrough on a simulator/device or against a live
  backend. No simulator is attached to this environment; `.env`'s
  `EXPO_PUBLIC_API_BASE_URL` points at a real deployed backend
  (`operion-services-production.up.railway.app`) but this session had no way to drive the
  app's UI against it. Every screen's request/response shape is real (per `SESSION_BRIEF_B`
  and the gaps noted above) but none of the 8 create/approve/reject/supersede/receive flows
  have been exercised end-to-end yet.

## Not done this pass

The Pencil redraw (`operion.pen`) — handed to `SESSION_BRIEF_E_PENCIL_MODULE1_REDRAW.md`
for a session that has the file open live; Pencil MCP tools are unreachable from a
headless/background session. A real device/simulator walkthrough against the live
backend — flagging rather than claiming it, per this build's own rule about not asserting
untested things as verified.

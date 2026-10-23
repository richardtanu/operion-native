# Operion Backend — API Contract (Auth, Part, Procurement)

**Source of truth:** read directly from the backend Java source at `c:\demo\src\main\java\com\example\operion`
(controllers, request/response DTOs, validation annotations, service-layer checks) — not inferred from the
mobile client, not guessed, not from any spec doc (none exists). Where the mobile app's own types previously
disagreed with this, the app was wrong (see [Known gaps](#known-gaps-and-footguns) — `requestedBy` was the
first one found and fixed; `receivedBy` was the same bug, fixed 14 Oct 2026).

Regenerate this by re-reading the backend rather than hand-editing if it drifts from the code.

---

## Changes since BE-13 (backend `main` e828f9e, 22 Oct 2026)

Read from source (controllers and DTOs on backend `main`) and the change queue's "What was done" notes for BE-14…BE-23. Where these contradict a section below, these win.

| Change | Status / shape | Mobile handling |
|---|---|---|
| `POST /purchase-requests` (BE-14) | MANAGER+ scope, or ADMIN / PROCUREMENT role, else 403. Optional `tenantId` (target store): another store needs ADMIN/PROCUREMENT/OWNER+ (else 403), outside the tree → 400 "Store not found". `requestedBy`: the caller or a user of the target store | PROC-01 create gated `MANAGER+·ADMIN·PROC`; store picker for HQ, locked store for a Store Manager |
| `PurchaseRequestResponse` (BE-14) | + `tenantId`, `tenantName` | Shown on PROC-02 rows and detail |
| `GET /tenants/tree` (BE-14) | Caller's tenant first, then every descendant; never ancestors. Any signed-in user. `TenantResponse{id, name, code, active, parentId, parentName, monthlyPurchaseBudget}` | `api/tenants.ts`; store pickers, "am I at HQ" on PROC-06 |
| `PATCH /purchase-requests/{id}/cancel` (BE-15) | Body `{reason}` required. PENDING → requester (anywhere in tree) or the store's own OWNER+; APPROVED → the store's own OWNER+. `GET /{id}`, `/history`, cancel now look across the caller's tree; approve/reject stay own-store | PROC-02 cancel gated by status, reason field shared with reject |
| `PATCH /tenants/{id}/purchase-budget` (BE-16) | `{amount \| null}`; only OWNER+ signed in at that very store | Budget editor on the PROC-02 spending card |
| `GET /procurement/spending?month=yyyy-MM[&tenantId=]` (BE-16) | OWNER+ only. Rows per store: `spentFromCentre`, `spentOutside`, `spent`, `committed`, `budget`, `overBudget`, `topParts[{partId, partName, amount}]` | `SpendingSummary` on PROC-02 |
| PRA create / cancel (BE-17) | **OWNER+** (was MANAGER+, BE-13) | PROC-03 badge `OWNER+` |
| `POST /realisasi` (BE-17, BE-21) | MANAGER+ scope or PROCUREMENT role, else 403. Optional `tenantId` (HQ buying for a store: PROCUREMENT or OWNER+). New `sellerName`. A `mandatoryFromHq` item without the franchise-centre `supplierId` → 400 "This item must be bought from HQ: …" | PROC-04 create gated `MANAGER+·PROC`; "Bought from: Elsewhere (seller) / At HQ"; mandatory lines marked |
| `PATCH /realisasi/{id}/reject` (BE-17) | OWNER+, from PENDING_APPROVAL or APPROVED. Body `{reason}` `@NotBlank` (it always was — the app used to send none) | Reject with reason, gated `OWNER+` |
| `POST /realisasi/{id}/supersede` (BE-17) | The original's creator or OWNER+; original must be PENDING_APPROVAL or APPROVED | Supersede gated `CREATOR·OWNER+` |
| Reimbursement (BE-18) | `PATCH /realisasi/reimbursements/mark-paid {ids, paidAt, method: CASH\|TRANSFER, reference?}` and `PATCH /realisasi/{id}/reimbursement/undo {reason}` — the store's own OWNER+, never for money owed to yourself. `GET /realisasi?paymentMethod=&reimbursementStatus=` filtered on the server. Response + `reimbursedToName`, `reimbursedAt`, `reimbursementMethod`, `reimbursementReference`. The person owed sees `totalCost` of their own personal purchase | PROC-08 rewritten: Owed / Paid back, select several, mark paid back, undo |
| Uploads (BE-23) | `POST /uploads {purpose, contentType, sizeBytes}` → `{uploadId, putUrl, method, headers, expiresAt}`; PUT the file to `putUrl` with exactly those headers. `GET /uploads/{id}` → 5-minute view link. JPEG/PNG/WebP/PDF ≤ 5 MB. **503 until the R2 bucket is configured** | `api/uploads.ts` (resize to 1600 px, JPEG 0.7, then PUT); `PhotoPicker` |
| Purchase orders (BE-20, BE-21) | Draft: MANAGER+ or PROCUREMENT. Send: OWNER+. Cancel: DRAFT → creator or OWNER+; sent → OWNER+ with `{reason}`. + `createdById`, `createdByName`. Lines must be HQ catalog items (or the store's linked part); supplier set by the server to HQ's franchise centre, `supplierId` ignored | PROC-07 rewritten as "Order from HQ" |
| `GET /catalog` (BE-21) | HQ's sold items: `{id, name, brand, categoryName, partTypeName, consumable, mandatoryFromHq, storePartId, storeCurrentStock}` | PROC-07 item picker |
| Parts, suppliers (BE-21) | `PartResponse` + `catalogPartId`, `soldByHq`, `mandatoryFromHq`; `SupplierResponse` + `franchiseCentre`. `PATCH /parts/{id}/hq-flags`, `/catalog-link` (HQ only) | Mandatory items marked on PROC-04; HQ's supplier labelled on PROC-06 |
| Goods receipts (BE-20) | Receiver taken from the token (`receivedBy` optional, must equal the caller). Buyer = receiver on the Realisasi path needs `goodsPhotoUploadIds` (≥ 1) → `selfReceived: true`, Owner notified. Filter `selfReceived=true` | PROC-05: photo field, no `receivedBy`; list chip and filter |
| History and activity (BE-22) | `actorKind` (`USER` \| `AUTOMATIC` \| `NOT_RECORDED`), `triggeredByName`, `triggerReference` on `StatusHistoryResponse` and activity entries | `HistoryList`; PROC-09 shows "Automatic · after {name} — {what}" |
| Notifications | New types `PURCHASE_REQUEST_CANCELLED`, `REIMBURSEMENT_PAID`, `GOODS_SELF_RECEIVED` | Labelled in the inbox |

**Known gaps the app works around (not yet backend tasks):** `PartResponse` and `PurchaseRequestAuthorizationResponse` carry no store, so when HQ files or buys for a store the app can't filter the part or PRA lists to that store — the server refuses a wrong-store pick. HQ's catalog has no price, so the store types the price on an order to HQ.

## Changes since BE-12 (backend `main` 19f5b73, 14 Oct 2026)

Read from source in the backend repo (`c:\richards stuff\demo`). Where these contradict a section below, these win.

| Change | Status / shape | Mobile handling |
|---|---|---|
| Permission denials | 403 (was 400). SoD violations stay 400 | Screens show the server message; PRA create maps 403 to a Manager+ message |
| Expired or invalid JWT | 401, **plain-text** body `Invalid JWT token` (from `JwtAuthenticationFilter`) | `api/client.ts` parses non-JSON bodies; any 401 on an authed request signs the user out |
| No token at all | 403 (backend plans to make this 401) | Only hit when signed out |
| Unknown path / wrong method | 404 / 405 (were 500) | Outbox fails 4xx at once, retries 5xx up to 5 times |
| `POST /auth/register` | ADMIN bearer token required; `scope` in body ignored | Unused in the app |
| `POST /auth/login` | Unknown email 400 `Invalid credentials`; wrong password 401 | Both shown as "Email or password is incorrect." |
| `POST /purchase-requests` | `requestedBy` must be in the caller's own tenant, else 400 `Requesting user not found in your branch` | App always sends the signed-in user |
| `POST /purchase-authorizations`, `PATCH …/{id}/cancel` | MANAGER scope or above, else 403 (BE-13) | PROC-03 button gated `MANAGER+` |
| PRA items | `purchasedValue`, `remainingValue` null below OWNER; `maxValue` always visible (BE-13) | Rendered masked |
| `PurchaseOrderResponse` | `totalAmount` and item `price` null below OWNER (BE-11) | PROC-07 renders by null, no client masking |
| `GET /goods-receipts` | Tree-scoped, newest `receivedDate` first. Filters `from`, `to` (inclusive `yyyy-MM-dd`), `receivedBy`, `path` (`PO`\|`REALISASI`, else 400) (BE-08) | PROC-05 list screen |
| `GET /goods-receipts/{id}` | Out-of-tree id answers like a missing one | `getGoodsReceipt()` |
| `GET /procurement/activity` | Newest-first status changes across PR, PRA, Realisasi, PO. ADMIN or PROCUREMENT role, or OWNER+ scope, else 403. Filters `from`, `to`, `tenantId`, `actorId`, `type`, `limit` (default 100, max 500) (BE-07) | PROC-09 Activity Log screen |
| `PATCH /users/{id}/role` | ADMIN only, tree-contained, never your own role | Unused in the app |
| Notifications | New types `PURCHASE_REQUEST_APPROVED`, `_REJECTED`, `_AUTHORIZED` (to the requester) and `PURCHASE_AUTHORIZATION_CREATED` (to PROCUREMENT users in the PRA's tenant). `GET /notifications` is newest first; `PATCH /{id}/read`, `PATCH /read-all`, `GET /unread-count` | Notifications screen + dashboard unread count (`api/notifications.ts`) |

---

## Global conventions

**Success envelope** — every endpoint, no exceptions:
```json
{ "success": true, "message": "string", "data": { /* per-endpoint shape below */ } }
```

**Error envelope** — a *different* shape, hand-built by `GlobalExceptionHandler`, never wrapped in the success envelope:
| Case | Status | Body |
|---|---|---|
| Bean Validation failure (`@Valid` rejects) | 400 | `{ timestamp, error: "Validation failed", details: { field: message, ... } }` |
| `BadCredentialsException` | 401 | `{ timestamp, error: "Invalid username or password" }` |
| Generic `RuntimeException` (most service-layer manual checks) | 400 | `{ timestamp, error }` — no `details` map, the message is the whole story |
| Anything else | 500 | `{ timestamp, error: "Internal server error", desc }` |
| Missing JWT (Spring Security filter chain) | 403 | **no body at all** — never reaches `GlobalExceptionHandler` |
| Expired or malformed JWT (`JwtAuthenticationFilter`) | 401 | plain text `Invalid JWT token` — not JSON |

The mobile app's `api/client.ts` already reads `details` and appends it to the thrown `ApiError.message`.

**Auth:** `SecurityConfig` — only `POST /auth/login` and `POST /auth/register` are `permitAll`. Every other
endpoint in this document requires a valid `Authorization: Bearer <jwt>` header.

**Tenant scoping:** `tenantId` is *always* derived server-side from JWT claims (`JwtAuthenticationFilter` →
`TenantContext`) — it is never a request field anywhere in the API. List endpoints (`GET` collections) return
records for the caller's tenant **and all descendant tenants** (`TenantHierarchyService.getEffectiveTenantIds`).
Single-record `GET .../{id}` and history endpoints scope to the caller's **own** tenant only (not descendants) —
a record belonging to a different tenant behaves like a 404 (thrown as a generic `RuntimeException`, so surfaces
as a 400, not an actual 404).

**Role vs. Scope — read this before assuming anything is gated:**
- `Role` enum: `ADMIN, TECHNICIAN, PROCUREMENT, ACCOUNTING, OPERATOR` — exists on the user profile, but **no
  endpoint in the Part or Procurement modules checks it**. No `@PreAuthorize` on any role, anywhere in these
  two modules.
- `Scope` enum (ordinal low→high): `SUPERVISOR < MANAGER < OWNER < PRINCIPAL`. This is the enforcement axis
  that actually exists, and only on a handful of endpoints — see the ⚠️ markers below. Checked via
  `ScopeContext.hasAtLeast(Scope.X)`, a manual service-layer call, not a Spring annotation.
- Everything else genuinely is "any authenticated user in the tenant hierarchy can do this." Several screens'
  own callouts already say this explicitly (e.g. PROC-01's "no role or scope gate") — that's not the screen
  under-drawing the rule, that's the actual rule.

---

## Auth module

### `POST /auth/register` — public
| Request (`RegisterRequest`) | Type | Required |
|---|---|---|
| `email` | String | `@NotBlank` |
| `password` | String | `@NotBlank` |
| `fullName` | String | `@NotBlank` |
| `tenantCode` | String | optional — defaults to `BLITZ_BDG` server-side |
| `scope` | `Scope` | optional — `null` if omitted, no default applied |

Response `data`: `{ token: string }`

### `POST /auth/login` — public
| Request (`LoginRequest`) | Type | Required |
|---|---|---|
| `email` | String | `@NotBlank` |
| `password` | String | `@NotBlank` |

Response `data`: `{ token: string }`

### `GET /auth/me` — authenticated
Response `data` (`UserProfileResponse`): `{ id: UUID, email: string, fullName: string, role: Role, scope: Scope | null }`

### `PATCH /users/{id}/scope` — ⚠️ `Role.ADMIN` only (the one real `@PreAuthorize` in the whole API)
Request: `{ scope: Scope }` — `@NotNull`
Response `data`: `UserProfileResponse` (same shape as `/auth/me`)

---

## Part module

Not owned by Procurement, but every create screen in Module 1 needs it for a real Part picker.

### `POST /parts` — authenticated, no role/scope gate
| Field | Type | Required |
|---|---|---|
| `name` | String | not annotated — service doesn't null-check either, effectively optional |
| `brand` | String | optional |
| `categoryId` | UUID | **required, service-enforced** ("Category is required" — generic 400, not a `details` validation error) |
| `partTypeId` | UUID | **required, service-enforced** ("Part Type is required", same non-`details` 400). Service also checks `partType.category.id == category.id`, throws on mismatch. |
| `expectedLifespanDays` | Integer | optional, `@Min(1)` if present |
| `minimumStock` | Integer | optional |
| `reorderQuantity` | Integer | optional |
| `manualDailyUsage` | BigDecimal | optional |
| `manualReorderPoint` | Integer | optional |
| `notes` | String | optional |

`tenantId` is never in the body — derived from JWT, same as everywhere else.

### `GET /parts` — authenticated
Returns active parts (`active=true`) for tenant + descendants. `data: PartResponse[]`

### `PUT /parts/{partId}` — authenticated, partial update
All fields optional (`UpdatePartRequest`); only non-null/non-blank fields are applied. If `categoryId` is
supplied, `partTypeId` must be too (or throws) — you can't change category without re-confirming type.

### `PATCH /parts/{partId}/retire` — authenticated
Request: `{ reason: string }` — `@NotBlank`. Throws if `currentStock > 0` or the part is currently installed.

### `PATCH /parts/{partId}/restore` — authenticated
No body. Throws if the part isn't currently retired.

### `PartResponse`
```
id: UUID
name: string
brand: string | null
category: string | null        // legacy, same value as categoryName
categoryId: UUID | null
categoryName: string | null
partTypeId: UUID | null
partTypeName: string | null
expectedLifespanDays: number | null
notes: string | null
currentStock: number
minimumStock: number | null
reorderQuantity: number | null
manualDailyUsage: number | null
manualReorderPoint: number | null
retired: boolean
retiredAt: string | null        // LocalDateTime
```

### Picker-backing endpoints — confirmed to exist, so `categoryId`/`partTypeId` are never raw-UUID-blind

**`PartCategoryController` (`/part-categories`)** — all authenticated, no role/scope gate:
- `POST /part-categories` — `{ name, description, consumable: boolean }`, no validation annotations
- `GET /part-categories` — `data: PartCategoryResponse[]`
- `PUT /part-categories/{id}` — ⚠️ returns the raw `PartCategoryResponse`, **not** wrapped in the `{success,message,data}` envelope — inconsistent with the rest of the API, don't assume `.data` unwrapping works here
- `DELETE /part-categories/{id}` — 204 No Content
- `POST /part-categories/seed` — seeds tenant defaults, `data: null`

`PartCategoryResponse`: `{ id: UUID, name: string, description: string | null, consumable: boolean | null }`

**`PartTypeController` (`/part-types`)** — all authenticated, no role/scope gate:
- `POST /part-types` — `{ categoryId: UUID, name: string, description: string }`, no validation annotations
- `GET /part-types` — all types for tenant
- `GET /part-types/category/{categoryId}` — filtered by category, ideal for a dependent Category → Type picker
- `PUT /part-types/{id}` / `DELETE /part-types/{id}`

`PartTypeResponse`: `{ id: UUID, categoryId: UUID, categoryName: string, name: string, description: string | null }`

---

## Procurement module

Base source: `module/procurement`. Same global envelope/auth/tenant rules as above apply throughout.

### 1. Purchase Request — `/purchase-requests`

| Endpoint | Auth beyond JWT |
|---|---|
| `POST /purchase-requests` | none |
| `GET /purchase-requests` | none |
| `GET /purchase-requests/{id}` | none |
| `PATCH /purchase-requests/{id}/approve` | ⚠️ `Scope.OWNER`+ |
| `PATCH /purchase-requests/{id}/reject` | ⚠️ `Scope.OWNER`+ |
| `PATCH /purchase-requests/{id}/cancel` | none — real asymmetry, not a drawing error |
| `GET /purchase-requests/{id}/history` | none |

**`POST` request (`CreatePurchaseRequestRequest`):**
```
requestedBy: UUID        @NotNull  — client-supplied, NOT derived from JWT
items: [                 @NotEmpty @Valid
  { partId: UUID @NotNull, quantity: number @Positive }
]
```
`approve`/`reject` require status `PENDING`. `reject` body: `{ reason: string }` `@NotBlank`. `cancel` allows
`PENDING` or `APPROVED`.

**`PurchaseRequestResponse`:**
```
id: UUID
status: 'PENDING'|'APPROVED'|'REJECTED'|'ORDERED'|'AUTHORIZED'|'CANCELLED'
requestedById: UUID | null
requestedByName: string | null
purchaseOrderId: UUID | null      // set once a PO consumes this PR
items: PurchaseRequestItemResponse[]
createdAt: string
```
`PurchaseRequestItemResponse`: `{ id, partId, partName, quantity }` — none nullable.

**Shared `StatusHistoryResponse`** (PR/PRA/Realisasi/PO history endpoints all return this):
```
previousStatus: string | null   // null on the first row
newStatus: string
changedByName: string | null    // null for system-driven transitions (PO auto-status, PRA refresh)
reason: string | null
createdAt: string
```

### 2. Purchase Request Authorization (PRA) — `/purchase-authorizations`

| Endpoint | Auth beyond JWT |
|---|---|
| `POST /purchase-authorizations` | none |
| `PATCH /purchase-authorizations/{id}/cancel` | none |
| `GET /purchase-authorizations` | none |
| `GET /purchase-authorizations/{id}` | none |
| `GET /purchase-authorizations/{id}/history` | none |

**`POST` request (`CreatePurchaseRequestAuthorizationRequest`):**
```
purchaseRequestIds: UUID[]   @NotEmpty — every id must be an APPROVED PurchaseRequest in-tenant, else 400
items: [                     @NotEmpty @Valid
  { partId: UUID @NotNull, authorizedQty: number @Positive, maxValue: number @NotNull @Positive }
]
```
`approvedBy` is derived from the JWT — **not** a request field (unlike `requestedBy` above). No approve
endpoint exists — creation *is* the authorization, matching every screen's own copy.

**`PurchaseRequestAuthorizationResponse`:**
```
id: UUID
status: 'ACTIVE'|'PARTIALLY_FULFILLED'|'FULFILLED'|'CANCELLED'
approvedById: UUID | null
approvedByName: string | null
approvedByScope: Scope | null   // ← this is what the client needs to evaluate the DL-08 exemption below
items: PurchaseRequestAuthorizationItemResponse[]
purchaseRequestIds: UUID[]
createdAt: string
```
`PurchaseRequestAuthorizationItemResponse`: `{ id, partId, partName, authorizedQty, maxValue, purchasedQty,
purchasedValue, remainingQty, remainingValue }` — `purchasedQty`/`purchasedValue` are live aggregates from
`APPROVED` Realisasi items only; `remainingQty`/`remainingValue` **can go negative** if an escalated Realisasi
is later approved past the ceiling. **No BE-06 cost redaction on this response** — `maxValue`/`purchasedValue`/
`remainingValue` are visible at every scope (only Realisasi's own response redacts cost).

### 3. Realisasi — `/realisasi`

| Endpoint | Auth beyond JWT |
|---|---|
| `POST /realisasi` | conditional — see DL-08 below |
| `PATCH /realisasi/{id}/approve` | ⚠️ `Scope.OWNER`+, escalated-only |
| `PATCH /realisasi/{id}/reject` | none |
| `POST /realisasi/{id}/supersede` | none directly (but re-runs DL-08 against the *original*'s PRA) |
| `GET /realisasi`, `/{id}`, `/{id}/history` | none |

**`POST` request (`CreateRealisasiRequest`):**
```
purchaseRequestAuthorizationId: UUID   @NotNull — PRA must exist in-tenant, not CANCELLED
externalOrderRef: string               @NotBlank — must be globally unique (not tenant-scoped check!)
channel: string                        optional
supplierId: UUID                       optional — resolved against the ROOT tenant's suppliers
paymentRef: string                     optional
paymentMethod: 'COMPANY_ACCOUNT'|'PERSONAL_REIMBURSABLE'   @NotNull
purchasedAt: string                    optional — defaults to now() server-side
subtotal: number                       @NotNull — NOT @Positive, can be 0 or negative
sellerDiscount: number                 optional — defaults 0
platformVoucher: number                optional — defaults 0
shipping: number                       optional — defaults 0
insurance: number                      optional — defaults 0
serviceFee: number                     optional — defaults 0
attachments: string                    optional — NOT required at creation (only required later, at goods receipt)
retroPurchaseFlag: boolean             optional — defaults false
items: [                               @NotEmpty @Valid
  {
    purchaseRequestAuthorizationItemId: UUID  @NotNull — must belong to the PRA above
    partId: UUID                              @NotNull
    purchaseUom: string                       @NotBlank
    conversionFactor: number                  @NotNull @Positive
    purchasedQty: number                      @Positive (not @NotNull)
    actualUnitPrice: number                   @NotNull @Positive
  }
]
```
`createdBy` derived from JWT, not a request field.

Server computes `totalCost = subtotal - sellerDiscount - platformVoucher + shipping + insurance + serviceFee`,
and per-line `allocatedLandedCost = totalCost * (lineSubtotal / headerSubtotal)` (0 if headerSubtotal ≤ 0).

**Auto-approve / escalation** — per item, cumulative approved-purchased qty/value against that PRA line is
checked; if any line's new total exceeds `authorizedQty` or `maxValue` → whole record: `status=PENDING_APPROVAL`,
`varianceStatus=ESCALATED`. Otherwise: `status=APPROVED`, `varianceStatus=WITHIN_CEILING` — **immediately, at
creation, no approval step.** This is the exact "auto-approve" behavior every screen already draws.

`reimbursementStatus` auto-set: `PENDING` if `paymentMethod=PERSONAL_REIMBURSABLE`, else `NOT_APPLICABLE`.

**DL-08 segregation-of-duties**: blocked if the current user is the same person who approved the target PRA —
**unless** that approver's *persisted* `Scope` was `OWNER` or higher. This is the one real scope-based exemption
in the whole API; every other exemption/gap you might assume exists does not.

`approve` (escalated-only, requires `PENDING_APPROVAL`, `Scope.OWNER`+) → `APPROVED`.
`reject` (`{ reason } @NotBlank`, requires `PENDING_APPROVAL` or `APPROVED`) → `FAILED` (rejected items stop
counting toward PRA fulfillment).
`supersede` (`{ reason @NotBlank, correction: CreateRealisasiRequest }`) — ⚠️ **`correction` is `@Valid` but not
`@NotNull`** — omitting it NPEs server-side (500), not a clean 400. Original flips to `SUPERSEDED`; a brand-new
Realisasi is created via the same `create()` path (full validation/escalation logic re-runs), linked by
`supersedesId`. Response is the **new** record, not the original.

**`RealisasiResponse` — BE-06 cost redaction confirmed:**
```
id: UUID
purchaseRequestAuthorizationId: UUID
status: 'PENDING_APPROVAL'|'APPROVED'|'FAILED'|'SUPERSEDED'
varianceStatus: 'WITHIN_CEILING'|'ESCALATED' | null
externalOrderRef: string
channel: string | null
supplierId: UUID | null
supplierName: string | null
paymentRef: string | null
paymentMethod: 'COMPANY_ACCOUNT'|'PERSONAL_REIMBURSABLE' | null
reimbursementStatus: 'NOT_APPLICABLE'|'PENDING'|'REIMBURSED' | null
purchasedAt: string
subtotal: number | null           // ← null below Scope.OWNER
sellerDiscount: number | null     // ← null below Scope.OWNER
platformVoucher: number | null    // ← null below Scope.OWNER
shipping: number | null           // ← null below Scope.OWNER
insurance: number | null          // ← null below Scope.OWNER
serviceFee: number | null         // ← null below Scope.OWNER
totalCost: number | null          // ← null below Scope.OWNER
attachments: string | null        // NOT redacted
retroPurchaseFlag: boolean
createdById: UUID | null
createdByName: string | null
approvedById: UUID | null
approvedByName: string | null
supersedesId: UUID | null
items: RealisasiItemResponse[]
createdAt: string
```
`RealisasiItemResponse`: `{ id, purchaseRequestAuthorizationItemId, partId, partName, purchaseUom,
conversionFactor, purchasedQty }` always visible, plus `actualUnitPrice: number | null` and
`allocatedLandedCost: number | null` — **both null below `Scope.OWNER`**, same gate as the header.

The redaction is a real `null`, not an omitted key and not a zero — render it as "restricted", never as `0`.

### 4. Goods Receipt — `/goods-receipts`

**No `GET /goods-receipts` and no `GET /goods-receipts/{id}` exist at all.** Only two list-by-parent endpoints.
This matches every screen's own "no list endpoint" callout.

| Endpoint | Auth beyond JWT |
|---|---|
| `POST /goods-receipts` | conditional — see DL-11 below |
| `GET /goods-receipts/purchase-order/{poId}` | none |
| `GET /goods-receipts/realisasi/{realisasiId}` | none |

**`POST` request (`CreateGoodsReceiptRequest`):**
```
purchaseOrderId: UUID    optional — exactly one of these two required (service-checked, not @Valid)
realisasiId: UUID        optional
receivedBy: UUID         @NotNull — client-supplied, NOT derived from JWT (⚠️ see Known gaps below)
receivedDate: string     optional
notes: string             optional
items: [                 @NotEmpty @Valid
  {
    partId: UUID          @NotNull
    realisasiItemId: UUID optional on the DTO, but service throws if missing on the Realisasi path; unused on the PO path
    quantity: number       @Positive (not @NotNull)
  }
]
```

**Two distinct server paths, real asymmetry — draw them differently, don't normalize:**
- **PO path**: PO must be `ORDERED` or `PARTIALLY_RECEIVED`. Received qty validated cumulatively against ordered
  qty per part; over-receipt throws. PO auto-transitions to `RECEIVED` or `PARTIALLY_RECEIVED`. **No receiver
  check of any kind, no attachment requirement.**
- **Realisasi path**: Realisasi must be `APPROVED`. **DL-11, unconditional, no exemption at any scope** (unlike
  DL-08's Owner+ exemption): `receivedBy` must differ from the Realisasi's `createdBy`, else throws. Realisasi
  must have non-blank `attachments`, else throws — "Cannot receive — no attachment on file" is a real server
  rule, not just a drawn callout. Received qty validated cumulatively against `purchasedQty × conversionFactor`
  (stock units) per item; over-receipt throws.

Both paths adjust part stock and, for non-consumable parts, generate `PartInstance` rows; the Realisasi path
additionally stamps a per-unit landed cost on generated instances.

**`GoodsReceiptResponse`:**
```
id: UUID
purchaseOrderId: UUID | null    // null on Realisasi-path receipts
poNumber: string | null         // same condition
realisasiId: UUID | null        // null on PO-path receipts
externalOrderRef: string | null // same condition
receivedById: UUID | null
receivedByName: string | null
receivedDate: string | null
notes: string | null
items: GoodsReceiptItemResponse[]   // no cost fields anywhere on this response — nothing to redact
```
`GoodsReceiptItemResponse`: `{ id, partId, partName, realisasiItemId: UUID | null, quantity }`.

### 5. Supplier — `/suppliers`

**No update, no delete, no `GET /{id}` — only create and list.**

| Endpoint | Auth beyond JWT |
|---|---|
| `POST /suppliers` | ⚠️ root-tenant only — real, enforced |
| `GET /suppliers` | none — readable from any tenant in the hierarchy |

**`POST` request:** `{ name: string @NotBlank, contact: string (optional) }`

Confirmed server-side: `SupplierService.create()` computes the caller's root tenant and throws *"Suppliers are
managed centrally — only the top-level tenant can create one"* if the caller's own tenant isn't that root. This
is a **tenant-identity check, not a scope check** — any authenticated user whose tenant happens to be the root
tenant can create one, regardless of their `Scope`. `GET /suppliers` always returns the **root tenant's** list
(`findByTenantIdOrderByNameAsc` against the resolved root id) — every tenant in the hierarchy sees the same
shared list, with nothing in the response indicating that's what it is.

**`SupplierResponse`:** `{ id: UUID, name: string, contact: string | null, createdAt: string }`

### 6. Purchase Order — `/purchase-orders`

| Endpoint | Auth beyond JWT |
|---|---|
| `POST /purchase-orders` | none |
| `PATCH /purchase-orders/{id}/send` | none |
| `PATCH /purchase-orders/{id}/cancel` | none |
| `GET /purchase-orders`, `/{id}`, `/{id}/history` | none |

**`POST` request (`CreatePurchaseOrderRequest`):**
```
supplierId: UUID          optional at creation — required before /send (resolved against root tenant's suppliers)
items: [                  @NotEmpty @Valid
  { partId: UUID @NotNull, quantity: number @Positive, price: number @NotNull @Positive }
]
purchaseRequestIds: UUID[]  optional — if given, every id must be an APPROVED PurchaseRequest in-tenant;
                             linked PRs transition to ORDERED
```
`poNumber` is auto-generated as `"PO-" + System.currentTimeMillis()` — **not guaranteed unique under concurrent
creates**, worth knowing if you ever see a duplicate. `orderDate` defaults to today. `status` starts `DRAFT`.
`totalAmount` is server-computed: `Σ(price × quantity)`.

`send` requires `DRAFT` status + a non-null `supplierId` + at least one item. `cancel` disallowed once
`RECEIVED` or already `CANCELLED`; cancelling reverts any linked `ORDERED` PurchaseRequest back to `APPROVED`
and unlinks it, with a history row on the PR.

**`PurchaseOrderResponse`** — the comments below describe the pre-BE-11 gap. Since 14 Oct 2026 `totalAmount` and
every item `price` are null below OWNER (see Changes since BE-12):
```
id: UUID
poNumber: string
status: 'DRAFT'|'ORDERED'|'PARTIALLY_RECEIVED'|'RECEIVED'|'CANCELLED'
supplierId: UUID | null
supplierName: string | null
orderDate: string
totalAmount: number        // ← always full value, every scope, no ScopeContext check anywhere in PurchaseOrderService.map()
items: PurchaseOrderItemResponse[]
purchaseRequestIds: UUID[]
createdAt: string
```
`PurchaseOrderItemResponse`: `{ id, partId, partName, quantity, price: number }` — `price` likewise always
visible at every scope. This is the real, currently-unpatched gap behind PROC-07's "BE-11 open" card — the
mobile app is correctly drawn to the *intended* redaction, not to what the backend actually returns today.

---

## Known gaps and footguns

1. **`receivedBy` on `POST /goods-receipts` is `@NotNull` and client-supplied — not derived from the JWT.**
   Same shape as `POST /purchase-requests`'s `requestedBy`. **Fixed in the app 14 Oct 2026:** the type requires
   it and PROC-05 sends the signed-in user.
   Related: `receivedDate` and Realisasi `purchasedAt` are `LocalDateTime`, so a bare `yyyy-MM-dd` fails to parse.
   The screens now send `yyyy-MM-ddT00:00:00` (`lib/dates.ts`).
2. **`SupersedeRealisasiRequest.correction` and several `*Item*.quantity`/`authorizedQty`/`purchasedQty` fields
   are effectively required but only `@Positive` (not `@NotNull`)** — a missing/null value NPEs the server as a
   500, not a clean validation `details` response. Client-side, treat these as required even though the
   backend's own validation wouldn't catch a clean `null`.
3. **BE-11 (Purchase Order cost redaction) — fixed server-side 14 Oct 2026.** `price`/`totalAmount` are null
   below OWNER, matching Realisasi's BE-06 pattern. PROC-07 now renders by null instead of masking by scope.
4. **`externalOrderRef` uniqueness on Realisasi is checked globally, not per-tenant** — two different tenants
   can't use the same external order reference. Probably not what a multi-tenant design intends, but that's
   what's enforced today.
5. **`PurchaseOrderItemResponse`/`GoodsReceiptItemResponse` history endpoints reuse the same `StatusHistoryResponse`
   shape as PR/PRA/Realisasi** — `changedByName` is `null` for every system-driven transition (PO auto-status
   on receipt, PRA auto-refresh on fulfillment change), not just user-driven ones. Don't render a blank name as
   an error state.

/**
 * Hand-written from the real backend source (c:\demo\src\main\java\com\example\operion\module\auth),
 * not guessed — checked against AuthController.java, LoginRequest.java, RegisterRequest.java,
 * AuthResponse.java, UserProfileResponse.java, ApiResponse.java, and the Role/Scope enums.
 */

/** Every successful response body is wrapped in this envelope — apiRequest() unwraps `.data` automatically. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Error bodies use a DIFFERENT shape than success bodies (GlobalExceptionHandler.java
 * builds these by hand, doesn't reuse ApiEnvelope) — `error`, not `message`.
 */
export interface ApiErrorBody {
  timestamp?: string;
  error?: string;
  desc?: string;
  details?: Record<string, string>;
}

export type Role = 'ADMIN' | 'TECHNICIAN' | 'PROCUREMENT' | 'ACCOUNTING' | 'OPERATOR';
export type Scope = 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'PRINCIPAL';

export interface LoginRequest {
  email: string;
  password: string;
}

/** ADMIN-only since BE-12. There is no scope field: grant one afterwards with PATCH /users/{id}/scope. */
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  /** Defaults to the calling ADMIN's own tenant; must be inside their tenant tree. */
  tenantCode?: string;
}

/** POST /auth/login and /auth/register both return just this — no user object. */
export interface AuthResponse {
  token: string;
}

/** GET /auth/me — the only place user profile data actually comes from. */
export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  scope: Scope | null;
  /** Tenant.code (e.g. "BLITZ_BDG") — added specifically so the client can theme itself per tenant. */
  tenantCode: string;
}

/**
 * Module 1 (Procurement), PROC-01…08. Field lists are `[C]`-verified in
 * SESSION_BRIEF_B_DESIGN_WIREFRAMES.md against the real backend source
 * (controller/DTO files cited per screen there) — not independently re-read
 * from the backend in this session. Where a create-request body wasn't
 * fully confirmed by that sweep, the type is built from the corresponding
 * response DTO's non-computed fields and flagged below; treat those as
 * best-effort, not verified.
 */

/** Six real values, not a two-state flow. */
export type PurchaseRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'AUTHORIZED' | 'CANCELLED';

/**
 * Owned by the Part module, not Procurement — confirmed against
 * PartController.java / PartResponse.java (c:\demo, module/part). Listed
 * here because PROC-01/03/04/05/07 all reference partId and need real
 * options to pick from; only the fields the picker UI actually renders are
 * kept, the rest of PartResponse (stock levels, reorder policy, etc.) is
 * out of scope for Procurement screens.
 */
export interface PartResponse {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string | null;
  categoryName: string | null;
  partTypeId: string | null;
  /** Distinct from category on the backend (partTypeId/partTypeName are their own field pair) — used to segment the Part picker. */
  partTypeName: string | null;
  expectedLifespanDays: number | null;
  notes: string | null;
  currentStock: number;
  /** Drives "low" for items without usage data (BE-27's rule). */
  minimumStock: number | null;
  reorderQuantity: number | null;
  manualDailyUsage: number | null;
  manualReorderPoint: number | null;
  retired: boolean;
  /** BE-21: the HQ catalog item this store part is linked to, if any. */
  catalogPartId: string | null;
  /** BE-21, read from HQ's row: HQ sells it / it must be bought from HQ. */
  soldByHq: boolean;
  mandatoryFromHq: boolean;
  /** BE-26: the store the item belongs to. */
  tenantId: string;
  tenantName: string;
  /** BE-28: HQ's price for it (a store item shows its HQ item's). Null unless OWNER+ or an HQ admin. */
  hqPrice: number | null;
}

/** PATCH /parts/{id}/hq-flags — HQ admins only. Null leaves a value unchanged; selling needs a price (BE-28). */
export interface UpdateHqFlagsRequest {
  soldByHq?: boolean;
  /** Implies soldByHq. */
  mandatoryFromHq?: boolean;
  price?: number;
}

export type StockMovementType = 'INITIAL_STOCK' | 'PURCHASE' | 'MAINTENANCE_USAGE' | 'ADJUSTMENT' | 'RETURN' | 'CONSUMABLE_TAKE';
export type StockReferenceType = 'MANUAL' | 'WORK_ORDER' | 'PURCHASE' | 'STOCK_ADJUSTMENT' | 'UNIT_INSTALL' | 'PART_INSTANCE';

/** GET /parts/{id}/movements (BE-26): one item's stock changes, newest first, each with who made it. */
export interface StockMovementResponse {
  id: string;
  partId: string;
  partName: string;
  movementType: StockMovementType;
  /** Signed: −2 for two taken. */
  quantity: number;
  beforeStock: number;
  afterStock: number;
  notes: string | null;
  referenceType: StockReferenceType | null;
  referenceId: string | null;
  /** Null on movements from before BE-26. */
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}

/** POST /parts (BE-25: the store's MANAGER+ or ADMIN). Category and type are required by the service. */
export interface CreatePartRequest {
  name: string;
  brand?: string;
  categoryId: string;
  partTypeId: string;
  expectedLifespanDays?: number;
  minimumStock?: number;
  reorderQuantity?: number;
  notes?: string;
}

/**
 * PUT /parts/{id} — partial; only non-null fields apply. Note the different
 * names from create: `manufacturer` is the brand, `expectedLifespan` the
 * lifespan in days. A new categoryId needs its partTypeId too.
 */
export interface UpdatePartRequest {
  name?: string;
  manufacturer?: string;
  categoryId?: string;
  partTypeId?: string;
  expectedLifespan?: number;
  minimumStock?: number;
  reorderQuantity?: number;
  notes?: string;
}

/** `consumable` decides whether items are counted by quantity or one by one (part instances). */
export interface PartCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  consumable: boolean | null;
}

export interface PartTypeResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
}

/**
 * GET /catalog (BE-21): what HQ sells — the root tenant's live `soldByHq`
 * parts, name order. `storePartId`/`storeCurrentStock` are the caller's own
 * store's linked copy, null until the store first orders the item.
 */
export interface CatalogItemResponse {
  id: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  partTypeName: string | null;
  consumable: boolean;
  mandatoryFromHq: boolean;
  /** BE-28: what HQ charges per unit. Null unless OWNER+ or an HQ admin. */
  price: number | null;
  storePartId: string | null;
  storeCurrentStock: number | null;
}

/** GET /tenants/tree (BE-14): the caller's own tenant first, then every descendant. Never ancestors. */
export interface TenantResponse {
  id: string;
  name: string;
  code: string;
  active: boolean;
  parentId: string | null;
  parentName: string | null;
  /** BE-16: null below Owner scope, and when the store hasn't set one. */
  monthlyPurchaseBudget: number | null;
}

export interface CreatePurchaseRequestItemRequest {
  partId: string;
  quantity: number;
}

/**
 * `requestedBy` is a required UUID on the request body — confirmed against
 * `CreatePurchaseRequestRequest.java` (`@NotNull`), not derived from the
 * bearer token server-side like most other writes in this app. Omitting it
 * fails Bean Validation with a generic "Validation failed" error and no
 * hint which field is missing (see api/client.ts's `details` handling).
 */
export interface CreatePurchaseRequestRequest {
  /**
   * BE-14: the store the PR is for. Omit for the caller's own store. A
   * different store needs ADMIN/PROCUREMENT role or OWNER+ (else 403) and
   * must be in the caller's tree (else 400 "Store not found").
   */
  tenantId?: string;
  /** The caller, or a user of the target store (BE-14). */
  requestedBy: string;
  items: CreatePurchaseRequestItemRequest[];
}

export interface PurchaseRequestItemResponse {
  id: string;
  partId: string;
  partName: string;
  quantity: number;
}

export interface PurchaseRequestResponse {
  id: string;
  status: PurchaseRequestStatus;
  requestedById: string;
  requestedByName: string;
  /** BE-14: the store the PR is for — differs from the requester's own when HQ filed it. */
  tenantId: string;
  tenantName: string;
  purchaseOrderId: string | null;
  items: PurchaseRequestItemResponse[];
  createdAt: string;
}

/** Reject a PR (OWNER+), cancel a PR (BE-15), reject or undo-reimburse a Realisasi — `reason` is `@NotBlank`. */
export interface RejectRequest {
  reason: string;
}

/** BE-22: who a status change belongs to. AUTOMATIC = server-made, triggered by `triggeredByName`. */
export type ActorKind = 'USER' | 'AUTOMATIC' | 'NOT_RECORDED';

/** GET …/{id}/history on PR, PRA, Realisasi and PO. */
export interface StatusHistoryEntry {
  previousStatus: string | null;
  newStatus: string;
  changedByName: string | null;
  reason: string | null;
  actorKind: ActorKind;
  triggeredByName: string | null;
  triggerReference: string | null;
  createdAt: string;
}

/** Four real, reachable states, recomputed live after every Realisasi transition against this PRA. */
export type PurchaseRequestAuthorizationStatus = 'ACTIVE' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';

export interface CreatePurchaseRequestAuthorizationItemRequest {
  partId: string;
  authorizedQty: number;
  /** Owner+-only in the response (BE-06 redacts below Owner) — still required to create the ceiling. */
  maxValue: number;
}

export interface CreatePurchaseRequestAuthorizationRequest {
  purchaseRequestIds: string[];
  items: CreatePurchaseRequestAuthorizationItemRequest[];
}

export interface PurchaseRequestAuthorizationItemResponse {
  id: string;
  partId: string;
  partName: string;
  authorizedQty: number;
  /** The spending limit — visible at every scope (BE-13), so the buyer knows their ceiling. */
  maxValue: number | null;
  purchasedQty: number;
  /** Null below Owner scope (BE-13) — summed from Realisasi spend, which BE-06 hides. */
  purchasedValue: number | null;
  /** Computed live, never stored — always render via Field variant="derived". */
  remainingQty: number;
  /** Null below Owner scope too: maxValue − remainingValue would give purchasedValue straight back. */
  remainingValue: number | null;
}

export interface PurchaseRequestAuthorizationResponse {
  id: string;
  status: PurchaseRequestAuthorizationStatus;
  approvedById: string;
  approvedByName: string;
  approvedByScope: Scope | null;
  items: PurchaseRequestAuthorizationItemResponse[];
  purchaseRequestIds: string[];
  createdAt: string;
  /** BE-26: the store the limits are for. */
  tenantId: string;
  tenantName: string;
}

/** `PENDING_APPROVAL/APPROVED/FAILED/SUPERSEDED` — independent of `varianceStatus`. */
export type RealisasiStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'FAILED' | 'SUPERSEDED';
export type VarianceStatus = 'WITHIN_CEILING' | 'ESCALATED';
/** `NOT_APPLICABLE` for company-paid purchases; `PENDING → REIMBURSED` via mark-paid (BE-18). */
export type ReimbursementStatus = 'NOT_APPLICABLE' | 'PENDING' | 'REIMBURSED';
export type PaymentMethod = 'COMPANY_ACCOUNT' | 'PERSONAL_REIMBURSABLE';
export type ReimbursementMethod = 'CASH' | 'TRANSFER';

export interface RealisasiItemResponse {
  id: string;
  purchaseRequestAuthorizationItemId: string;
  partId: string;
  partName: string;
  /** Purchase UOM, not stock units — label it, never assume it matches received quantity. */
  purchaseUom: string;
  conversionFactor: number;
  purchasedQty: number;
  /** Null below Owner scope. */
  actualUnitPrice: number | null;
  /** Null below Owner scope. */
  allocatedLandedCost: number | null;
}

export interface RealisasiResponse {
  id: string;
  purchaseRequestAuthorizationId: string;
  status: RealisasiStatus;
  varianceStatus: VarianceStatus;
  externalOrderRef: string | null;
  channel: string;
  supplierId: string | null;
  supplierName: string | null;
  /** BE-21: free-text seller for a purchase outside HQ ("Shopee · Toko Airsoft Jaya"). */
  sellerName: string | null;
  paymentRef: string | null;
  paymentMethod: string;
  reimbursementStatus: ReimbursementStatus | null;
  /** BE-18: set once the store Owner marks it paid back. */
  reimbursedToName: string | null;
  reimbursedAt: string | null;
  reimbursementMethod: ReimbursementMethod | null;
  reimbursementReference: string | null;
  purchasedAt: string;
  subtotal: number | null;
  sellerDiscount: number | null;
  platformVoucher: number | null;
  shipping: number | null;
  insurance: number | null;
  serviceFee: number | null;
  totalCost: number | null;
  attachments: string | null;
  retroPurchaseFlag: boolean;
  createdById: string;
  createdByName: string;
  approvedById: string | null;
  approvedByName: string | null;
  supersedesId: string | null;
  items: RealisasiItemResponse[];
  createdAt: string;
}

export interface CreateRealisasiItemRequest {
  purchaseRequestAuthorizationItemId: string;
  partId: string;
  purchasedQty: number;
  actualUnitPrice: number;
}

/** Checked against CreateRealisasiRequest.java (backend main, 22 Oct 2026). */
export interface CreateRealisasiRequest {
  /** BE-17: HQ buying for a store — PROCUREMENT role or OWNER+, inside the caller's tree. Omit for own store. */
  tenantId?: string;
  purchaseRequestAuthorizationId: string;
  externalOrderRef?: string;
  channel: string;
  /** A supplier from HQ's list; HQ's franchise-centre supplier for an urgent buy of a mandatory item. */
  supplierId?: string;
  /** BE-21: where it was bought, for a purchase outside HQ. */
  sellerName?: string;
  paymentRef?: string;
  paymentMethod: string;
  purchasedAt: string;
  subtotal: number;
  sellerDiscount: number;
  platformVoucher: number;
  shipping: number;
  insurance: number;
  serviceFee: number;
  attachments?: string;
  retroPurchaseFlag?: boolean;
  items: CreateRealisasiItemRequest[];
}

/** POST /realisasi/{id}/supersede wraps the corrected record — sending a bare CreateRealisasiRequest is a 400 "Reason is required". */
export interface SupersedeRealisasiRequest {
  reason: string;
  correction: CreateRealisasiRequest;
}

/** PATCH /realisasi/reimbursements/mark-paid (BE-18). All-or-nothing; the store's own OWNER+ only. */
export interface MarkReimbursedRequest {
  ids: string[];
  /** `yyyy-MM-dd`. */
  paidAt: string;
  method: ReimbursementMethod;
  reference?: string;
}

/** Optional server-side filters on GET /realisasi (BE-18). */
export interface RealisasiFilters {
  paymentMethod?: PaymentMethod;
  reimbursementStatus?: ReimbursementStatus;
}

export interface GoodsReceiptItemResponse {
  id: string;
  partId: string;
  partName: string;
  realisasiItemId: string | null;
  /** Stock units — not the same number as the Realisasi line's purchaseQty (purchase UOM). */
  quantity: number;
}

export interface GoodsReceiptResponse {
  id: string;
  purchaseOrderId: string | null;
  poNumber: string | null;
  realisasiId: string | null;
  externalOrderRef: string | null;
  receivedById: string;
  receivedByName: string;
  receivedDate: string;
  notes: string | null;
  /** BE-20: the buyer received their own purchase — allowed only with a goods photo; the Owner is notified. */
  selfReceived: boolean;
  goodsPhotoUploadIds: string[];
  items: GoodsReceiptItemResponse[];
}

export interface CreateGoodsReceiptItemRequest {
  partId: string;
  /** Only meaningful on the Realisasi path. */
  realisasiItemId?: string;
  quantity: number;
}

/** Which path a receipt came in on — the `path` filter on GET /goods-receipts (anything else is a 400). */
export type GoodsReceiptPath = 'PO' | 'REALISASI';

/** Optional filters on GET /goods-receipts (BE-08). Dates are inclusive `yyyy-MM-dd`. */
export interface GoodsReceiptFilters {
  from?: string;
  to?: string;
  receivedBy?: string;
  path?: GoodsReceiptPath;
  /** BE-20. */
  selfReceived?: boolean;
}

/** Exactly one of `purchaseOrderId` / `realisasiId` — enforced server-side, throws if both or neither. */
export interface CreateGoodsReceiptRequest {
  purchaseOrderId?: string;
  realisasiId?: string;
  /**
   * BE-20: the receiver is the caller, taken from the token. Optional; when
   * sent it must equal the caller (else 400). Left out by this app.
   */
  receivedBy?: string;
  /** BE-20: required when the caller bought this Realisasi themself ("You bought this: add a photo…"). */
  goodsPhotoUploadIds?: string[];
  /** `LocalDateTime` server-side: send `yyyy-MM-ddTHH:mm:ss` — a bare date fails to parse. */
  receivedDate: string;
  notes?: string;
  items: CreateGoodsReceiptItemRequest[];
}

/** Deliberately thin — no address, no payment terms, no tax ID. */
export interface SupplierResponse {
  id: string;
  name: string;
  contact: string;
  /** BE-21: HQ's own selling supplier — one per HQ. Buying a mandatory item outside an order needs this one. */
  franchiseCentre: boolean;
  createdAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact: string;
}

/** Five values — `PARTIALLY_RECEIVED` sits between `ORDERED` and `RECEIVED`. */
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItemResponse {
  id: string;
  partId: string;
  partName: string;
  quantity: number;
  /** Null below Owner scope (BE-11, redacted server-side) — render masked, not as an error. */
  price: number | null;
}

export interface PurchaseOrderResponse {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  supplierId: string | null;
  supplierName: string | null;
  orderDate: string | null;
  /** Null below Owner scope (BE-11), same as PurchaseOrderItemResponse.price. */
  totalAmount: number | null;
  items: PurchaseOrderItemResponse[];
  purchaseRequestIds: string[];
  /** BE-20: null on orders made before it. */
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

/** No price: the server takes HQ's price on create and again on send (BE-28). Unpriced → 400. */
export interface CreatePurchaseOrderItemRequest {
  /** BE-21: an HQ catalog item id, or the store's part linked to one. Anything HQ doesn't sell → 400. */
  partId: string;
  quantity: number;
}

/** BE-21: the supplier is always HQ's franchise centre, set by the server — `supplierId` is ignored, so not sent. */
export interface CreatePurchaseOrderRequest {
  purchaseRequestIds?: string[];
  items: CreatePurchaseOrderItemRequest[];
}

/** PATCH /purchase-orders/{id}/cancel (BE-20): reason optional for a DRAFT, required once sent. */
export interface CancelPurchaseOrderRequest {
  reason?: string;
}

// ---------- Spending (BE-16) ----------

export interface SpendingPartResponse {
  partId: string;
  partName: string;
  amount: number;
}

/**
 * GET /procurement/spending?month=yyyy-MM[&tenantId=] — OWNER+ only. One row per
 * store in the caller's tree, own store first. Definitions: BE-16 "Spent" /
 * "Committed" in the backend change queue. `committed` is a snapshot as of
 * now, not a monthly figure.
 */
export interface StoreSpendingResponse {
  tenantId: string;
  tenantName: string;
  month: string;
  spentFromCentre: number;
  spentOutside: number;
  spent: number;
  committed: number;
  budget: number | null;
  /** BE-19: active expenses dated this month, and their HQ / Branch specific split. */
  otherExpenses: number;
  otherExpensesHq: number;
  otherExpensesBranch: number;
  /** spent + committed + otherExpenses > budget; null without a budget. A warning, never a block. */
  overBudget: boolean | null;
  topParts: SpendingPartResponse[];
}

// ---------- Expenses (BE-19, PROC-10) ----------

/** A label for visibility, not a charge: the branch pays both, both count in its budget. */
export type ExpenseCategory = 'HQ' | 'BRANCH_SPECIFIC';
/** `PERSONAL` is "paid by me" on screen; it's paid back by the store Owner like a purchase. */
export type ExpensePaidBy = 'STORE' | 'PERSONAL';
/** No edit: a wrong entry is voided with a reason and entered again. */
export type ExpenseStatus = 'ACTIVE' | 'VOIDED';

/**
 * POST /expenses — the store's MANAGER+; `STORE` only OWNER+. Always the
 * caller's own store. A `PERSONAL` expense needs at least one receipt
 * (EXPENSE_RECEIPT upload). `expenseDate` (`yyyy-MM-dd`) defaults to today.
 */
export interface CreateExpenseRequest {
  description: string;
  amount: number;
  expenseDate?: string;
  category: ExpenseCategory;
  paidBy: ExpensePaidBy;
  receiptUploadIds: string[];
}

/** `amount` is null below OWNER, except the claimant's own PERSONAL expense (BE-18's exception). */
export interface ExpenseResponse {
  id: string;
  tenantId: string;
  tenantName: string;
  description: string;
  amount: number | null;
  /** `yyyy-MM-dd`. */
  expenseDate: string;
  category: ExpenseCategory;
  paidBy: ExpensePaidBy;
  status: ExpenseStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  receiptUploadIds: string[];
  voidedByName: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  /** `NOT_APPLICABLE` when paid by the store, and once voided. */
  reimbursementStatus: ReimbursementStatus;
  reimbursedByName: string | null;
  reimbursedAt: string | null;
  reimbursementMethod: ReimbursementMethod | null;
  reimbursementReference: string | null;
  reimbursementUndoReason: string | null;
}

/** GET /expenses filters, all server-side. Owed = `paidBy=PERSONAL&reimbursementStatus=PENDING`. */
export interface ExpenseFilters {
  category?: ExpenseCategory;
  paidBy?: ExpensePaidBy;
  reimbursementStatus?: ReimbursementStatus;
  status?: ExpenseStatus;
  from?: string;
  to?: string;
}

// ---------- Inventory (module 2) ----------

/** OUT at ≤ 0; otherwise LOW by the one rule (BE-27). */
export type InventoryStockStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';

/**
 * BE-27's one rule: with usage data, low when it runs out before its target
 * days (RUNS_OUT_SOON); without, at or below minimum stock (BELOW_MINIMUM).
 * With usage data the minimum doesn't also apply.
 */
export type ServerLowBecause = 'RUNS_OUT_SOON' | 'BELOW_MINIMUM';

/** One row of GET /inventory/stock-summary (every item) or /inventory/low-stock (low by the rule, lowest first). */
export interface StockSummaryRow {
  partId: string;
  partName: string;
  currentStock: number;
  minimumStock: number | null;
  status: InventoryStockStatus;
  /** BE-26. */
  tenantId: string;
  tenantName: string;
  catalogPartId: string | null;
  /** BE-27: null when not low. Set alongside OUT_OF_STOCK too. */
  lowBecause: ServerLowBecause | null;
  /** BE-27: only when the item has usage data. */
  daysOfCover: number | null;
  targetDays: number | null;
}

/** GET /inventory/dashboard. Low counts by BE-27's rule; used today includes consumable takes (BE-26). Sums the whole tree for HQ. */
export interface InventoryDashboardResponse {
  totalParts: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  stockReceivedToday: number;
  stockUsedToday: number;
}

/** COMPUTED / MANUAL_RATE have usage data; MANUAL_LEVEL / NONE don't (days of cover is null, never 0). */
export type BurnRateSource = 'COMPUTED' | 'MANUAL_RATE' | 'MANUAL_LEVEL' | 'NONE';

/** GET /burn-rate (every item) or /burn-rate/{partId}. */
export interface BurnRateResponse {
  partId: string;
  partName: string;
  currentStock: number;
  burnRateSource: BurnRateSource;
  /** Units a day. */
  burnRate: number | null;
  observationDays: number | null;
  eventCount: number | null;
  daysOfCover: number | null;
  targetDays: number | null;
  suggestedQty: number | null;
  manualReorderPoint: number | null;
  belowLevel: boolean | null;
  /** BE-26; computed with the item's own store's settings. */
  tenantId: string;
  tenantName: string;
  catalogPartId: string | null;
}

export type StockAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** POST /stock-adjustments (BE-25: the store's MANAGER+). `quantity` is signed: −1 removes one. */
export interface CreateStockAdjustmentRequest {
  partId: string;
  quantity: number;
  reason: string;
}

/**
 * Approve: the store's own OWNER+ (HQ gets 400 "not found"). Your own
 * request needs another Owner (403) unless you're the store's only one —
 * then it's approved with `selfApproved: true`.
 */
export interface StockAdjustmentResponse {
  id: string;
  partId: string;
  partName: string;
  quantity: number;
  reason: string;
  status: StockAdjustmentStatus;
  requestedById: string;
  requestedByName: string;
  selfApproved: boolean;
  createdAt: string;
  /** BE-26. */
  tenantId: string;
  tenantName: string;
}

// ---------- Uploads (BE-23) ----------

export type UploadPurpose = 'GOODS_RECEIPT_PHOTO' | 'EXPENSE_RECEIPT' | 'PURCHASE_RECEIPT';

/** POST /uploads — JPEG/PNG/WebP/PDF, at most 5 MB. Type and size are signed into the URL. */
export interface CreateUploadRequest {
  purpose: UploadPurpose;
  contentType: string;
  sizeBytes: number;
}

/** PUT the file to `putUrl` with exactly `headers`, within 10 minutes, then send `uploadId` with the record. */
export interface UploadTicketResponse {
  uploadId: string;
  putUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: string;
}

/** GET /uploads/{id} — a 5-minute link to view the file. */
export interface UploadViewResponse {
  uploadId: string;
  purpose: UploadPurpose;
  contentType: string;
  sizeBytes: number;
  getUrl: string;
  expiresAt: string;
  attached: boolean;
}

// ---------- Procurement activity log (BE-07) ----------

export type ProcurementEntityType = 'PURCHASE_REQUEST' | 'PURCHASE_REQUEST_AUTHORIZATION' | 'REALISASI' | 'PURCHASE_ORDER';

/**
 * One status change on a PR, PRA, Realisasi or PO. Readable by ADMIN or
 * PROCUREMENT role, or OWNER+ scope — 403 for anyone else.
 */
export interface ProcurementActivityEntry {
  at: string;
  entityType: ProcurementEntityType;
  entityId: string;
  /** PO number or Realisasi external order ref, where one exists. */
  reference: string | null;
  tenantId: string;
  tenantName: string;
  /** Null on an AUTOMATIC change and on a NOT_RECORDED (pre-BE-07, test data only) row. */
  actorId: string | null;
  actorName: string | null;
  /** Null means the record was created. */
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
  /** BE-22. */
  actorKind: ActorKind;
  /** AUTOMATIC only: whose action caused it, and what ("SHP-ORD-88213 approved", "PO-… goods received"). */
  triggeredByName: string | null;
  triggerReference: string | null;
}

/** Optional filters on GET /procurement/activity. `limit` defaults to 100 server-side, max 500. */
export interface ProcurementActivityFilters {
  from?: string;
  to?: string;
  tenantId?: string;
  actorId?: string;
  type?: ProcurementEntityType;
  limit?: number;
}

// ---------- Notifications ----------

export type NotificationType =
  | 'NEW_PURCHASE_REQUEST'
  | 'PURCHASE_REQUEST_ORDERED'
  | 'PART_END_OF_LIFE'
  | 'LOW_STOCK'
  | 'REALISASI_ESCALATED'
  | 'PURCHASE_REQUEST_APPROVED'
  | 'PURCHASE_REQUEST_REJECTED'
  | 'PURCHASE_REQUEST_AUTHORIZED'
  | 'PURCHASE_AUTHORIZATION_CREATED'
  | 'PURCHASE_REQUEST_CANCELLED'
  | 'REIMBURSEMENT_PAID'
  | 'GOODS_SELF_RECEIVED'
  | 'STOCK_ADJUSTMENT_REQUESTED';

/** Only ever the caller's own notifications. Nobody is notified of their own action (BE-07). */
export interface NotificationResponse {
  id: string;
  /** A plain string server-side — a type added later must still render. */
  type: NotificationType | (string & {});
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

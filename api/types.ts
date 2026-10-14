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

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  /** Defaults to BLITZ_BDG on the backend if omitted. */
  tenantCode?: string;
  scope?: Scope;
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
  categoryName: string | null;
  /** Distinct from category on the backend (partTypeId/partTypeName are their own field pair) — used to segment the Part picker. */
  partTypeName: string | null;
  retired: boolean;
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
  purchaseOrderId: string | null;
  items: PurchaseRequestItemResponse[];
  createdAt: string;
}

export interface RejectRequest {
  reason: string;
}

/**
 * Exact shape not read in detail by SESSION_BRIEF_B — only the endpoint's
 * existence is `[C]`-confirmed. Rendered defensively (optional fields with
 * an index signature) rather than asserting an unverified shape as fact.
 */
export interface StatusHistoryEntry {
  id?: string;
  status?: string;
  createdAt?: string;
  changedByName?: string;
  note?: string;
  [key: string]: unknown;
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
}

/** `PENDING_APPROVAL/APPROVED/FAILED/SUPERSEDED` — independent of `varianceStatus`. */
export type RealisasiStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'FAILED' | 'SUPERSEDED';
export type VarianceStatus = 'WITHIN_CEILING' | 'ESCALATED';
/** `REIMBURSED` is declared but never reachable today (no endpoint sets it) — kept in the type for completeness, not because the app can produce it. */
export type ReimbursementStatus = 'PENDING' | 'REIMBURSED';

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
  paymentRef: string | null;
  paymentMethod: string;
  reimbursementStatus: ReimbursementStatus | null;
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

/**
 * Best-effort from RealisasiResponse's non-computed fields (totalCost and
 * allocatedLandedCost are server-computed, excluded here) — the create
 * request body itself wasn't read in full by SESSION_BRIEF_B.
 */
export interface CreateRealisasiRequest {
  purchaseRequestAuthorizationId: string;
  externalOrderRef?: string;
  channel: string;
  supplierId?: string;
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
}

/** Exactly one of `purchaseOrderId` / `realisasiId` — enforced server-side, throws if both or neither. */
export interface CreateGoodsReceiptRequest {
  purchaseOrderId?: string;
  realisasiId?: string;
  /**
   * Required (`@NotNull`), client-supplied like PR's `requestedBy` — not taken
   * from the token. Must differ from the Realisasi's creator (SoD, no exemption).
   */
  receivedBy: string;
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
  createdAt: string;
}

export interface CreatePurchaseOrderItemRequest {
  partId: string;
  quantity: number;
  price: number;
}

export interface CreatePurchaseOrderRequest {
  supplierId?: string;
  purchaseRequestIds?: string[];
  items: CreatePurchaseOrderItemRequest[];
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
  /** Null for a system-derived change (e.g. a PRA recomputed to FULFILLED) or a row written before BE-07. */
  actorId: string | null;
  actorName: string | null;
  /** Null means the record was created. */
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
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

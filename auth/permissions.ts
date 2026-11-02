import type { Role, Scope, UserProfileResponse } from '../api/types';

/**
 * Client-side mirrors of backend access rules, used only to decide what to
 * show. The server still enforces each one; a mismatch shows up as a 403.
 */

type User = UserProfileResponse | null;

const managerPlus = (u: User) => u?.scope === 'MANAGER' || u?.scope === 'OWNER' || u?.scope === 'PRINCIPAL';
export const ownerPlus = (u: User) => u?.scope === 'OWNER' || u?.scope === 'PRINCIPAL';

/** BE-41: who sees money amounts and reads money lists — OWNER+ or the ACCOUNTING role (reads only). */
const seesMoney = (u: User) => ownerPlus(u) || u?.role === 'ACCOUNTING';

/** GET /procurement/activity: ADMIN, PROCUREMENT or ACCOUNTING (BE-41) role, or OWNER+ scope (BE-07). */
export function canReadActivityLog(user: User): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'PROCUREMENT' || seesMoney(user);
}

/** POST /purchase-requests: MANAGER+ scope, or ADMIN / PROCUREMENT role (BE-14). Accounting can't. */
export function canCreatePurchaseRequest(user: User): boolean {
  return managerPlus(user) || user?.role === 'ADMIN' || user?.role === 'PROCUREMENT';
}

/** Filing for a store other than your own (BE-14): ADMIN or PROCUREMENT role, or OWNER+. */
export function canFileForAnotherStore(user: User): boolean {
  return user?.role === 'ADMIN' || user?.role === 'PROCUREMENT' || ownerPlus(user);
}

/** Setting or cancelling spending limits (PRA): OWNER+ (BE-17, superseding BE-13's Manager+). */
export function canSetSpendingLimits(user: User): boolean {
  return ownerPlus(user);
}

/** Logging a purchase (Realisasi): MANAGER+ scope or PROCUREMENT role (BE-17). */
export function canLogPurchase(user: User): boolean {
  return managerPlus(user) || user?.role === 'PROCUREMENT';
}

/** HQ buying for a store (BE-17): PROCUREMENT role or OWNER+. */
export function canBuyForAnotherStore(user: User): boolean {
  return user?.role === 'PROCUREMENT' || ownerPlus(user);
}

/** Drafting an order to HQ: MANAGER+ or PROCUREMENT (BE-20). */
export function canDraftOrder(user: User): boolean {
  return managerPlus(user) || user?.role === 'PROCUREMENT';
}

/** Spending summary (BE-16): OWNER+, or Accounting since BE-41. */
export function canReadSpending(user: User): boolean {
  return seesMoney(user);
}

/** The store's monthly budget (BE-16): OWNER+ signed in at that store; Accounting only reads it. */
export function canSetBudget(user: User): boolean {
  return ownerPlus(user);
}

/** GET /procurement/cashflow (BE-41): OWNER+ or Accounting. */
export function canReadCashflow(user: User): boolean {
  return seesMoney(user);
}

/** Recording an expense (BE-19): the store's MANAGER+. "Paid by the store" needs OWNER+. */
export function canRecordExpense(user: User): boolean {
  return managerPlus(user);
}

export function canRecordStorePaidExpense(user: User): boolean {
  return ownerPlus(user);
}

/** Asking for a stock adjustment (BE-25): the store's MANAGER+. */
export function canRequestStockAdjustment(user: User): boolean {
  return managerPlus(user);
}

/** Approving or rejecting one (BE-25): the store's own OWNER+; HQ is refused by the server. */
export function canDecideStockAdjustment(user: User): boolean {
  return ownerPlus(user);
}

/** Adding or editing items (BE-25): MANAGER+ or ADMIN. */
export function canEditItems(user: User): boolean {
  return managerPlus(user) || user?.role === 'ADMIN';
}

/** Retiring or restoring items (BE-25): OWNER+ or ADMIN. */
export function canRetireItems(user: User): boolean {
  return ownerPlus(user) || user?.role === 'ADMIN';
}

/** Linking a store item to HQ's (BE-25): the store's MANAGER+ may create a link; changing one is HQ's. */
export function canLinkToCatalog(user: User): boolean {
  return managerPlus(user);
}

/**
 * HQ's catalog flags, prices and links (BE-21, BE-28), and the one category
 * list (BE-29): ADMIN role or PRINCIPAL scope, signed in at HQ.
 */
export function canManageHqCatalog(user: User, atHq: boolean): boolean {
  return atHq && (user?.role === 'ADMIN' || user?.scope === 'PRINCIPAL');
}

/** A store's settings (BE-38): its own OWNER+, signed in at that store. HQ reads them. */
export function canChangeStoreSettings(user: User, atOwnStore: boolean): boolean {
  return atOwnStore && ownerPlus(user);
}

// ---------- People (BE-31…BE-36) ----------

const SCOPES: Scope[] = ['SUPERVISOR', 'MANAGER', 'OWNER', 'PRINCIPAL'];
const rank = (s: Scope | null) => (s ? SCOPES.indexOf(s) : -1);
const isAdmin = (u: User) => u?.role === 'ADMIN';

/** The Users screen: an ADMIN (their tree) or a store's OWNER+ (their own store, BE-34). */
export function canManagePeople(user: User): boolean {
  return isAdmin(user) || ownerPlus(user);
}

/**
 * Whether `user` may change `target` at all — scope, role, switch off/on,
 * reset password. Never yourself. An Admin: anyone in the list (it is
 * already their tree) not above their own scope (BE-31). An Owner: their own
 * store's people below Owner who aren't Admins (BE-34).
 */
export function canManagePerson(user: User, target: UserProfileResponse): boolean {
  if (!user || target.id === user.id) return false;
  if (isAdmin(user)) return target.scope == null || (user.scope != null && rank(target.scope) <= rank(user.scope));
  if (!ownerPlus(user)) return false;
  return target.tenantCode === user.tenantCode && target.role !== 'ADMIN' && rank(target.scope) < rank('OWNER');
}

/** Scopes `user` may grant (BE-31, BE-34): an Admin up to their own (none without one); an Owner Supervisor or Manager. */
export function grantableScopes(user: User): Scope[] {
  if (isAdmin(user)) return user?.scope ? SCOPES.slice(0, rank(user.scope) + 1) : [];
  if (ownerPlus(user)) return ['SUPERVISOR', 'MANAGER'];
  return [];
}

/** Roles `user` may give: an Admin any; an Owner any but ADMIN (BE-34). */
export function grantableRoles(user: User): Role[] {
  const all: Role[] = ['OPERATOR', 'TECHNICIAN', 'PROCUREMENT', 'ACCOUNTING', 'ADMIN'];
  if (isAdmin(user)) return all;
  if (ownerPlus(user)) return all.filter((r) => r !== 'ADMIN');
  return [];
}

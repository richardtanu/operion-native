import type { UserProfileResponse } from '../api/types';

/**
 * Client-side mirrors of backend access rules, used only to decide what to
 * show. The server still enforces each one; a mismatch shows up as a 403.
 */

type User = UserProfileResponse | null;

const managerPlus = (u: User) => u?.scope === 'MANAGER' || u?.scope === 'OWNER' || u?.scope === 'PRINCIPAL';
export const ownerPlus = (u: User) => u?.scope === 'OWNER' || u?.scope === 'PRINCIPAL';

/** GET /procurement/activity: ADMIN or PROCUREMENT role, or OWNER+ scope (BE-07). */
export function canReadActivityLog(user: User): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'PROCUREMENT' || ownerPlus(user);
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

/** Spending summary (BE-16): OWNER+. */
export function canReadSpending(user: User): boolean {
  return ownerPlus(user);
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

/** HQ's catalog flags, prices and links (BE-21, BE-28): ADMIN role or PRINCIPAL scope, signed in at HQ. */
export function canManageHqCatalog(user: User, atHq: boolean): boolean {
  return atHq && (user?.role === 'ADMIN' || user?.scope === 'PRINCIPAL');
}

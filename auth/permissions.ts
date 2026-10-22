import type { UserProfileResponse } from '../api/types';

/**
 * Client-side mirrors of backend access rules, used only to decide what to
 * show. The server still enforces each one; a mismatch shows up as a 403.
 */

/** GET /procurement/activity: ADMIN or PROCUREMENT role, or OWNER+ scope (BE-07). */
export function canReadActivityLog(user: UserProfileResponse | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'PROCUREMENT' || user.scope === 'OWNER' || user.scope === 'PRINCIPAL';
}

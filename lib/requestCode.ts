import type { ChipTone } from '../components/Chip';
import type { PurchaseRequestStatus } from '../api/types';
import { parseLocalDateTime } from './dates';

/** The colour of a request's status chip, the same on the list and the detail page. */
export const REQUEST_STATUS_TONE: Record<PurchaseRequestStatus, ChipTone> = {
  PENDING: 'pending',
  APPROVED: 'success',
  REJECTED: 'danger',
  ORDERED: 'neutral',
  AUTHORIZED: 'success',
  CANCELLED: 'neutral',
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A purchase request's short name for people: date, who asked, time, as
 * `20261115-RINA-1432` (15 Nov 2026, Rina, 14:32). The backend has no request
 * number, only a UUID, so this is built from the request's own fields
 * (15 Nov 2026); the full ID stays on the detail page. Two requests by the
 * same person in the same minute share a code.
 */
export function requestCode(pr: { createdAt: string; requestedByName: string | null }): string {
  const at = parseLocalDateTime(pr.createdAt);
  const who =
    (pr.requestedByName ?? '')
      .trim()
      .split(/\s+/)[0]
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 10) || 'UNKNOWN';
  if (!at) return who;
  return `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${who}-${pad(at.getHours())}${pad(at.getMinutes())}`;
}

import type { ChipTone } from "../components/Chip";
import type { PurchaseRequestStatus } from "../api/types";
import { parseLocalDateTime } from "./dates";

/** The colour of a request's status chip, the same on the list and the detail page. */
export const REQUEST_STATUS_TONE: Record<PurchaseRequestStatus, ChipTone> = {
  PENDING: "pending",
  APPROVED: "success",
  REJECTED: "danger",
  ORDERED: "neutral",
  AUTHORIZED: "success",
  CANCELLED: "neutral"
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A purchase request's name for people: date, who asked, then the time to
 * the millisecond, as `20261115-RINA-143207.947` (15 Nov 2026, Rina,
 * 14:32:07.947). The backend has no request number, only a UUID, so this is
 * built from the request's own fields (15 Nov 2026); the full ID stays on
 * the detail page. The milliseconds come straight from `createdAt`'s
 * fraction, which the backend writes when it isn't zero.
 */
export function requestCode(pr: {
  createdAt: string;
  requestedByName: string | null;
}): string {
  const at = parseLocalDateTime(pr.createdAt);
  const who =
    (pr.requestedByName ?? "")
      .trim()
      .split(/\s+/)[0]
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10) || "UNKNOWN";
  if (!at) return who;
  const ms = (/\.(\d+)/.exec(pr.createdAt)?.[1] ?? "")
    .padEnd(3, "0")
    .slice(0, 3);
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  return `${date}-${who}-${time}.${ms}`;
}

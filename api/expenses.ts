import { apiRequest, queryString } from './client';
import type { CreateExpenseRequest, ExpenseFilters, ExpenseResponse, MarkReimbursedRequest, RejectRequest } from './types';

/**
 * PROC-10 — Expenses (BE-19): branch spending that isn't stock. Money, so
 * never queued: every call goes straight to the server and fails loudly.
 * Pay-back follows BE-18's rules exactly (the store's own OWNER+, never
 * money owed to yourself).
 */

/** The store's MANAGER+; `paidBy: 'STORE'` needs OWNER+. A personal one needs a receipt photo (400 without). */
export function createExpense(request: CreateExpenseRequest, token: string): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>('/expenses', { method: 'POST', body: request, token });
}

/** The caller's tree, so HQ reads every store's. All filters are applied on the server. */
export function listExpenses(token: string, filters: ExpenseFilters = {}): Promise<ExpenseResponse[]> {
  return apiRequest<ExpenseResponse[]>(`/expenses${queryString(filters)}`, { token });
}

/** Whoever recorded it, or the store's OWNER+. ACTIVE only; a paid-back one must be undone first. */
export function voidExpense(id: string, request: RejectRequest, token: string): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>(`/expenses/${id}/void`, { method: 'PATCH', body: request, token });
}

/** One or several, all-or-nothing. The person owed gets one "Paid back" notification with the total. */
export function markExpensesPaid(request: MarkReimbursedRequest, token: string): Promise<ExpenseResponse[]> {
  return apiRequest<ExpenseResponse[]>('/expenses/reimbursements/mark-paid', { method: 'PATCH', body: request, token });
}

/** REIMBURSED → PENDING, with a reason. Same rule as mark-paid. */
export function undoExpensePayment(id: string, request: RejectRequest, token: string): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>(`/expenses/${id}/reimbursement/undo`, { method: 'PATCH', body: request, token });
}

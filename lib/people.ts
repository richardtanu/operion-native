import type { Role, Scope } from '../api/types';

/** How roles and scopes read on screen. "Owner+" in gates means Owner or Principal. */
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  TECHNICIAN: 'Technician',
  PROCUREMENT: 'Procurement',
  ACCOUNTING: 'Accounting',
  OPERATOR: 'Operator',
};

export const SCOPE_LABEL: Record<Scope, string> = {
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
  OWNER: 'Owner',
  PRINCIPAL: 'Principal',
};

export const scopeLabel = (scope: Scope | null) => (scope ? SCOPE_LABEL[scope] : 'No scope');

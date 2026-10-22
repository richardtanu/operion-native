// Centralizes user-facing strings that carry domain vocabulary flagged by the
// plan doc's AirsoftUnit -> ServiceableUnit rename (plan.md §2): any label
// containing "airsoft", "unit", "gun", or "part" is a candidate for becoming
// tenant-configurable. Keeping them here — instead of inline in components —
// means that swap is a one-file change later, not a grep-and-hope across the
// component tree. This is a placeholder module, not a full i18n system.

export const vocabulary = {
  serviceableUnit: 'Unit',
  serviceableUnitPlural: 'Units',
} as const;

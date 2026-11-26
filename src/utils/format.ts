import type { UserSummary } from '../api/types';

/** A date from the API (ISO string) in the user's locale, e.g. "26 November 2026". */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/** How another user is shown: "Display Name (@username)", or "@username". */
export const userLabel = (user: UserSummary) =>
  user.displayName ? `${user.displayName} (@${user.username})` : `@${user.username}`;

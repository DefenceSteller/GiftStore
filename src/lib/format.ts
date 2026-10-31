/** Format cents as the store's money string (matches original `money()`). */
export function money(cents: number): string {
  return `Rs ${(cents / 100).toFixed(2)}`;
}

/** Escape a string for safe interpolation (defensive; RSC output is escaped by React). */
export function esc(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

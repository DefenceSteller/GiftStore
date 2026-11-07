/** Format cents as the store's money string (matches original `money()`). */
export function money(cents: number): string {
  return `Rs ${(cents / 100).toFixed(2)}`;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", PKR: "Rs", EUR: "€", GBP: "£", INR: "₹", AED: "د.إ", SAR: "ر.س",
};

/** Return the symbol for a given currency code; falls back to 'Rs'. */
export function moneySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency?.toUpperCase()] || currency?.toUpperCase() || "Rs";
}

/** Format cents using the given currency code's symbol. */
export function formatMoney(cents: number, currency: string): string {
  const sym = moneySymbol(currency);
  if (/[$€£₹]/.test(sym)) return `${sym}${(cents / 100).toFixed(2)}`;
  return `${sym} ${(cents / 100).toFixed(2)}`;
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

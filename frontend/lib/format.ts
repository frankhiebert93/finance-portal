import type { Currency } from "./types";

// Convert an amount in `from` currency into `base` currency.
// usdMxn = how many MXN per 1 USD.
export function toBase(
  amount: number,
  from: Currency,
  base: Currency,
  usdMxn: number
): number {
  if (from === base) return amount;
  if (from === "USD" && base === "MXN") return amount * usdMxn;
  if (from === "MXN" && base === "USD") return amount / usdMxn;
  return amount;
}

export function formatMoney(
  amount: number,
  currency: Currency,
  opts: { sign?: boolean } = {}
): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat(
    currency === "MXN" ? "es-MX" : "en-US",
    { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }
  ).format(abs);
  if (opts.sign) {
    if (amount < 0) return "-" + formatted;
    if (amount > 0) return "+" + formatted;
  } else if (amount < 0) {
    return "-" + formatted;
  }
  return formatted;
}

export function formatDate(iso: string): string {
  // iso is YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

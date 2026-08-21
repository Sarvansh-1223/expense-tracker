export function formatCurrency(value, opts = {}) {
  const num = Number(value ?? 0);
  const { compact = false } = opts;
  if (compact && Math.abs(num) >= 100000) {
    return "₹" + (num / 100000).toFixed(1) + "L";
  }
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatCurrencyPrecise(value) {
  const num = Number(value ?? 0);
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatDateFull(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  upi: "UPI",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  bank_transfer: "Bank Transfer",
  net_banking: "Net Banking",
  other: "Other",
};

export const INCOME_SOURCE_LABELS = {
  salary: "Salary",
  freelance: "Freelance",
  business: "Business",
  investments: "Investments",
  bonus: "Bonus",
  other: "Other",
};

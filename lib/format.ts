export function formatRp(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = Math.round(Math.abs(n)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}Rp${grouped}`;
}

export function formatRpShort(n: number): string {
  if (n >= 1_000_000) {
    const jt = n / 1_000_000;
    return `Rp${jt % 1 === 0 ? jt : jt.toFixed(1).replace(".", ",")}jt`;
  }
  if (n >= 1_000) return `Rp${Math.round(n / 1000)}rb`;
  return formatRp(n);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${formatDate(ts)}, ${hh}.${mm}`;
}

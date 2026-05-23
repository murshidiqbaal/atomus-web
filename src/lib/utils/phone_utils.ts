export const ATOMUS_EMAIL_DOMAIN = "atomus.local";

export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export function phoneToEmail(phone: string): string {
  const digits = normalizePhone(phone);
  if (!digits) throw new Error("Phone number is required");
  return `${digits}@${ATOMUS_EMAIL_DOMAIN}`;
}

export function isAtomusEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith(`@${ATOMUS_EMAIL_DOMAIN}`);
}

export function emailToPhone(email: string): string {
  if (!isAtomusEmail(email)) return "";
  return email.split("@")[0];
}

export function formatPhoneDisplay(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length <= 5) return d;
  if (d.length <= 10) return `${d.slice(0, -5)} ${d.slice(-5)}`;
  return `+${d.slice(0, d.length - 10)} ${d.slice(-10, -5)} ${d.slice(-5)}`;
}

export function isValidPhone(phone: string): boolean {
  const d = normalizePhone(phone);
  return d.length >= 8 && d.length <= 15;
}

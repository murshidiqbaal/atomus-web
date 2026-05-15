/**
 * Generates a parent login password:
 * Format: First 3 letters of student name (capitalized) + last 5 digits of parent phone number
 * Example: student "Zainab Ahmed", phone "+923001234567" → "Zai34567"
 */
export function generateParentPassword(studentName: string, phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  const last5 = digits.slice(-5).padStart(5, '0');
  const namePart = studentName.trim().replace(/\s+/g, '');
  const first3Raw = namePart.slice(0, 3);
  const first3 = first3Raw.charAt(0).toUpperCase() + first3Raw.slice(1).toLowerCase();
  return `${first3}${last5}`;
}

/** Legacy random password generator (kept for non-parent accounts) */
export function generateSecurePassword(): string {
  const prefixes = ['ATM2026', 'Atomus', 'Sec'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const separators = ['@', '#', '$'];
  const sep = separators[Math.floor(Math.random() * separators.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${sep}${num}`;
}

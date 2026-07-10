/**
 * Generates a parent login password:
 * Format: First 3 letters of student name (capitalized) + last 5 digits of parent phone number
 * Example: student "Zainab Ahmed", phone "+923001234567" → "Zai34567"
 */
export function generateParentPassword(studentName: string, phoneNumber: string): string {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  const last5 = digits.slice(-5).padStart(5, '0');
  const namePart = (studentName || '').trim().replace(/[^a-zA-Z]/g, '');
  const rawFirst3 = namePart.padEnd(3, 'x').slice(0, 3);
  const first3 = rawFirst3.charAt(0).toUpperCase() + rawFirst3.slice(1).toLowerCase();
  return `${first3}${last5}`;
}

/**
 * Generates a teacher login password.
 * Format: First 3 letters of name (Title case) + "Edu" + "@" + 4 random digits
 * Example: teacher "Ahmad Raza" → "AhmEdu@4521"
 */
export function generateTeacherPassword(fullName: string): string {
  const namePart = fullName.trim().replace(/\s+/g, '');
  const first3Raw = namePart.slice(0, 3);
  const first3 = first3Raw.charAt(0).toUpperCase() + first3Raw.slice(1).toLowerCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${first3}Edu@${num}`;
}

/** Fallback random password (kept for legacy use) */
export function generateSecurePassword(): string {
  const prefixes = ['ATM2026', 'Atomus', 'Sec'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const separators = ['@', '#', '$'];
  const sep = separators[Math.floor(Math.random() * separators.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${sep}${num}`;
}

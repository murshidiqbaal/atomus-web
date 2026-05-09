/**
 * Generates a secure random password for parent accounts.
 * Format example: ATM2026@482 or Parent#4582
 */
export function generateSecurePassword(): string {
  const prefixes = ['ATM2026', 'Parent', 'Atomus', 'Sec'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const separators = ['@', '#', '$', '%', '&'];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  return `${prefix}${separator}${randomNum}`;
}

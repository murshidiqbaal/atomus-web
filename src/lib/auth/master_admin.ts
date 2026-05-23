// Client-side master-admin credential check.
//
// WARNING: these credentials are bundled into the client JS and visible to
// anyone who inspects DevTools. Only acceptable for a private/internal build.
// For a production deploy create a real Supabase Auth admin user instead.

export const MASTER_ADMIN_EMAIL = "atomus2026@gmail.com";
export const MASTER_ADMIN_PASSWORD = "Atomus@2026";
export const MASTER_ADMIN_FLAG = "atomus.masterAdmin";

export function looksLikeEmail(value: string): boolean {
  return /@/.test(value);
}

export function matchesMasterAdmin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() &&
    password === MASTER_ADMIN_PASSWORD
  );
}

export function setMasterAdminFlag() {
  try {
    localStorage.setItem(MASTER_ADMIN_FLAG, "1");
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearMasterAdminFlag() {
  try {
    localStorage.removeItem(MASTER_ADMIN_FLAG);
  } catch {
    /* ignore */
  }
}

export function readMasterAdminFlag(): boolean {
  try {
    return localStorage.getItem(MASTER_ADMIN_FLAG) === "1";
  } catch {
    return false;
  }
}

import { supabase } from "@/lib/supabase";

export function isInvalidTokenError(err: any): boolean {
  if (!err) return false;
  const msg = (
    typeof err === "string"
      ? err
      : err?.message || err?.error_description || err?.error || ""
  ).toLowerCase();
  return (
    msg.includes("invalid refresh token") ||
    msg.includes("refresh token not found") ||
    msg.includes("refresh_token_not_found") ||
    msg.includes("invalid_grant") ||
    msg.includes("token is expired") ||
    msg.includes("jwt expired")
  );
}

export async function clearStaleAuthTokens(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}

  if (typeof window !== "undefined") {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("sb-") ||
            key.includes("supabase") ||
            key.includes("auth-token"))
        ) {
          localStorage.removeItem(key);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.startsWith("sb-") ||
            key.includes("supabase") ||
            key.includes("auth-token"))
        ) {
          sessionStorage.removeItem(key);
        }
      }
      if (document.cookie) {
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0].trim();
          if (
            name.startsWith("sb-") ||
            name.includes("supabase") ||
            name.includes("auth-token")
          ) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
    } catch {}
  }
}

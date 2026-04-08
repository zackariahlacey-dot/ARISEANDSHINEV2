/**
 * HMAC-SHA256 token utilities for monthly plan invite and schedule links.
 * Uses Web Crypto API — works in all Next.js runtimes.
 */

const getSecret = () => process.env.MONTHLY_ONBOARD_SECRET ?? "dev-fallback-secret-change-me";

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromb64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "==".slice((b64.length + 3) & 3));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmacSign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

async function hmacVerify(data: string, sigB64url: string): Promise<boolean> {
  const expected = await hmacSign(data);
  if (expected.length !== sigB64url.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sigB64url.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Invite tokens (email + 7-day expiry) ─────────────────────────────────────

export async function signInviteToken(email: string): Promise<string> {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const data   = `invite:${email.toLowerCase()}:${expiry}`;
  const sig    = await hmacSign(data);
  return b64url(new TextEncoder().encode(`${data}|${sig}`));
}

export async function verifyInviteToken(token: string): Promise<string | null> {
  try {
    const raw   = new TextDecoder().decode(fromb64url(token));
    const pipe  = raw.lastIndexOf("|");
    if (pipe === -1) return null;
    const data  = raw.slice(0, pipe);
    const sig   = raw.slice(pipe + 1);
    if (!(await hmacVerify(data, sig))) return null;
    const parts = data.split(":");                  // ['invite', email, expiry]
    if (parts[0] !== "invite") return null;
    if (Date.now() > parseInt(parts[2], 10)) return null;
    return parts[1];                                // email
  } catch {
    return null;
  }
}

// ── Schedule tokens (subscriptionId + month + timestamp, 60-day expiry) ──────

export async function signScheduleToken(subscriptionId: string, month: string): Promise<string> {
  const signedAt = Date.now();
  const data = `schedule:${subscriptionId}:${month}:${signedAt}`;
  const sig  = await hmacSign(data);
  return b64url(new TextEncoder().encode(`${data}|${sig}`));
}

export async function verifyScheduleToken(
  token: string
): Promise<{ subscriptionId: string; month: string } | null> {
  try {
    const raw  = new TextDecoder().decode(fromb64url(token));
    const pipe = raw.lastIndexOf("|");
    if (pipe === -1) return null;
    const data = raw.slice(0, pipe);
    const sig  = raw.slice(pipe + 1);
    if (!(await hmacVerify(data, sig))) return null;
    // parts: ['schedule', uuid, 'YYYY-MM', signedAt]
    // Support legacy tokens (3 parts) without signedAt for backward compat
    const parts = data.split(":");
    if (parts[0] !== "schedule") return null;
    if (parts.length >= 4) {
      const signedAt = parseInt(parts[3], 10);
      const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
      if (Date.now() - signedAt > SIXTY_DAYS_MS) return null; // expired
    }
    return { subscriptionId: parts[1], month: parts[2] };
  } catch {
    return null;
  }
}

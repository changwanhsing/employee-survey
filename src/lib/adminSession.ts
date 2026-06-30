import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_TTL = 8 * 60 * 60; // 8 hours

function getSecret() {
  const raw = process.env.ADMIN_SECRET ?? process.env.SESSION_SECRET;
  if (!raw) throw new Error("ADMIN_SECRET must be set");
  return new TextEncoder().encode(raw);
}

export async function signAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_TTL}s`)
    .sign(getSecret());
}

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

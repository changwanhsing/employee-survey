import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  employeeId: string;
  name: string;
  department: string;
};

const SESSION_COOKIE = "survey_session";
const SESSION_TTL_SECONDS = 300; // 5 minutes

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      employeeId: payload.employeeId as string,
      name: payload.name as string,
      department: payload.department as string,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };

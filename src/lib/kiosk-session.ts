import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const KIOSK_COOKIE = "kiosk_session";
const KIOSK_TTL_SECONDS = 60;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required");
  return new TextEncoder().encode(value);
}

export type KioskToken = {
  sub: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
};

export async function signKioskToken(payload: KioskToken) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${KIOSK_TTL_SECONDS}s`)
    .sign(secret());
}

export async function readKioskToken() {
  const jar = await cookies();
  const token = jar.get(KIOSK_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.name !== "string") return null;
    return {
      sub: payload.sub,
      name: payload.name,
      role: payload.role as KioskToken["role"],
    } satisfies KioskToken;
  } catch {
    return null;
  }
}

export async function setKioskCookie(token: string) {
  const jar = await cookies();
  jar.set(KIOSK_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: KIOSK_TTL_SECONDS,
  });
}

export async function clearKioskCookie() {
  const jar = await cookies();
  jar.delete(KIOSK_COOKIE);
}

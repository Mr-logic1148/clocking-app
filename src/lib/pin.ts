import { createHmac, timingSafeEqual } from "crypto";

const PIN_REGEX = /^\d{4,6}$/;

function pepper() {
  const value = process.env.PIN_PEPPER;
  if (!value) {
    throw new Error("PIN_PEPPER is required — never hash kiosk PINs without a server-side pepper.");
  }
  return value;
}

export function isValidPinFormat(pin: string) {
  return PIN_REGEX.test(pin);
}

/** Security boundary: HMAC-SHA256 with PIN_PEPPER. Unique digest enables O(1) lookup without storing the PIN. */
export function hashPin(pin: string) {
  return createHmac("sha256", pepper()).update(pin).digest("hex");
}

export function pinsMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

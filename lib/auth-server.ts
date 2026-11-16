import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";

import { getDemoAccount, toSessionUser, type SessionUser } from "./auth";

export const SESSION_COOKIE = "campus-canon-session";
export const LEGACY_SESSION_COOKIE = "__Host-vibecraft-session";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.FORCE_SECURE_COOKIE === "true",
  path: "/",
};

const SECRET_FILE_PATH = path.join(
  process.cwd(),
  ".data",
  "session-secret.key"
);
let cachedGeneratedSecret: string | null = null;

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }

  if (cachedGeneratedSecret) {
    return cachedGeneratedSecret;
  }

  try {
    const existing = fs.readFileSync(SECRET_FILE_PATH, "utf8").trim();
    if (/^[0-9a-f]{64}$/i.test(existing)) {
      cachedGeneratedSecret = existing;
      return cachedGeneratedSecret;
    }
  } catch {
    // Key file not created yet — generate a random CSPRNG secret below.
  }

  const generated = crypto.randomBytes(32).toString("hex");
  cachedGeneratedSecret = generated;

  try {
    fs.mkdirSync(path.dirname(SECRET_FILE_PATH), { recursive: true });
    fs.writeFileSync(SECRET_FILE_PATH, `${generated}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch {
    // Read-only filesystem fallback still keeps per-process CSPRNG secret in memory.
  }

  return generated;
}

const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const failedLoginBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = failedLoginBuckets.get(key);
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };

  if (now >= entry.resetAt) {
    failedLoginBuckets.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_LOGIN_FAILURES) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  if (failedLoginBuckets.size > 1000) {
    for (const [k, v] of failedLoginBuckets.entries()) {
      if (now >= v.resetAt) failedLoginBuckets.delete(k);
    }
    if (failedLoginBuckets.size > 1000) {
      failedLoginBuckets.clear();
    }
  }

  const current = failedLoginBuckets.get(key);
  if (!current || now >= current.resetAt) {
    failedLoginBuckets.set(key, {
      count: 1,
      resetAt: now + LOGIN_WINDOW_MS,
    });
    return;
  }

  current.count += 1;
}

export function clearLoginFailures(key: string): void {
  failedLoginBuckets.delete(key);
}

export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const directHost = request.headers.get("host")?.trim().toLowerCase();
  let urlHost = "";
  try {
    urlHost = new URL(request.url).host.toLowerCase();
  } catch {
    urlHost = "";
  }

  const allowedHosts = [forwardedHost, directHost, urlHost].filter(
    (item): item is string => Boolean(item)
  );
  if (allowedHosts.length === 0) return false;

  return allowedHosts.includes(originHost);
}

function computeSignature(accountId: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(accountId)
    .digest("hex");
}

export function signSessionToken(accountId: string): string {
  return `${accountId}.${computeSignature(accountId)}`;
}

export function verifySessionToken(
  token: string | undefined | null
): string | null {
  if (!token) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const accountId = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!accountId || !signature) return null;

  const expected = computeSignature(accountId);
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");

  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  return accountId;
}

export function isAdminPinRequired(): boolean {
  return Boolean(process.env.ADMIN_ACCESS_PIN?.trim());
}

export function verifyAdminPin(pin: string | undefined): boolean {
  const configured = process.env.ADMIN_ACCESS_PIN?.trim();
  if (!configured) return true;
  if (!pin) return false;

  const a = Buffer.from(pin.trim(), "utf8");
  const b = Buffer.from(configured, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const rawToken =
    store.get(SESSION_COOKIE)?.value ??
    store.get(LEGACY_SESSION_COOKIE)?.value;
  const accountId = verifySessionToken(rawToken);
  const account = getDemoAccount(accountId);

  return account ? toSessionUser(account) : null;
}

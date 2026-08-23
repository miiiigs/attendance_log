import { DEFAULT_TIMEZONE } from "@attendance/shared";

const LOCAL_HOST_PATTERNS = [/^localhost$/i, /^127\./, /^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];

/**
 * Central backend URL configuration for the mobile app.
 *
 * Development may use `http://LAN_IP:3000`. Production builds refuse local
 * addresses so a production build can never silently target localhost.
 */
export function getAdminAppUrl(): string {
  const raw = process.env.EXPO_PUBLIC_ADMIN_APP_URL?.trim();

  if (!raw) {
    throw new Error("Missing EXPO_PUBLIC_ADMIN_APP_URL.");
  }

  const url = raw.endsWith("/") ? raw.slice(0, -1) : raw;

  if (!__DEV__) {
    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      throw new Error("EXPO_PUBLIC_ADMIN_APP_URL is not a valid URL.");
    }

    if (LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
      throw new Error(`EXPO_PUBLIC_ADMIN_APP_URL must not point to a local address in production builds (${hostname}).`);
    }
  }

  return url;
}

export function getOrgTimezone(orgTimezone?: string | null): string {
  const trimmed = orgTimezone?.trim();
  return trimmed ? trimmed : DEFAULT_TIMEZONE;
}

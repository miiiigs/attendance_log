function normalizeEnvValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  let normalized = value.trim();

  if (
    normalized.length >= 2 &&
    ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function requireEnv(name: string) {
  const value = normalizeEnvValue(process.env[name]);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name: string) {
  return normalizeEnvValue(process.env[name]);
}

export function getPublicSupabaseEnv() {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!/^https?:\/\//i.test(url)) {
    const preview = url.slice(0, 20);
    const charCodes = [...url].slice(0, 8).map((character) => character.charCodeAt(0)).join(",");
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is malformed after normalization. length=${url.length}; preview=${preview}; firstCharCodes=${charCodes}`,
    );
  }

  return { url, anonKey };
}

export function getServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getOptionalAppBaseUrl() {
  return optionalEnv("APP_BASE_URL");
}

export function getOptionalResendConfig() {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const fromEmail = optionalEnv("RESEND_FROM_EMAIL");
  const fromName = optionalEnv("RESEND_FROM_NAME");
  const appBaseUrl = optionalEnv("APP_BASE_URL");

  if (!apiKey || !fromEmail || !appBaseUrl) {
    return null;
  }

  return {
    apiKey,
    fromEmail,
    fromName,
    appBaseUrl: appBaseUrl.endsWith("/") ? appBaseUrl.slice(0, -1) : appBaseUrl,
  };
}

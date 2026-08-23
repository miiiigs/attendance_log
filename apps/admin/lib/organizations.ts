export function normalizeOrganizationCode(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.slice(0, 20);
}

export function suggestOrganizationCode(name: string) {
  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const initials = words.map((word) => word[0] ?? "").join("");
  const compact = words.join("").replace(/[^A-Z0-9]/g, "");
  let suggested = initials.length >= 3 ? initials : compact.slice(0, 8);

  if (suggested.length < 3) {
    suggested = `${suggested}ORG`.slice(0, 3);
  }

  return normalizeOrganizationCode(suggested);
}

export function buildOrganizationSlug(name: string, code: string) {
  const base = `${name}-${code}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (base.length >= 3) {
    return base.slice(0, 64);
  }

  return `organization-${code.trim().toLowerCase()}`.slice(0, 64);
}

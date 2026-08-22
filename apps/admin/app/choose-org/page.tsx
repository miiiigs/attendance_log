import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { requireAdminOrOrgAdmin } from "../../lib/auth";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChooseOrgPage() {
  const { user } = await requireAdminOrOrgAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("organization_id, organizations!organization_memberships_organization_id_fkey(name, code, slug, status)")
    .eq("user_id", user.id)
    .eq("role", "organization_admin")
    .eq("status", "active");

  const organizations = (memberships ?? [])
    .map((membership) => {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;
      return organization && organization.status === "active"
        ? { name: organization.name, code: organization.code, slug: organization.slug }
        : null;
    })
    .filter((org): org is { name: string; code: string; slug: string } => Boolean(org));

  return (
    <main className="admin-shell-bg min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-bold tracking-[0.18em] text-white">
            AL
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Activity Log</p>
            <p className="text-xs text-[var(--muted)]">Choose an organization console</p>
          </div>
        </div>

        <section className="admin-card p-6">
          {organizations.length ? (
            <div className="space-y-3">
              <p className="admin-eyebrow">Your organizations</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                You are an organization administrator for more than one organization. Select the console to open.
              </p>
              <div className="mt-5 space-y-3">
                {organizations.map((organization) => (
                  <Link
                    key={organization.slug}
                    href={`/org/${organization.slug}/dashboard`}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-[var(--foreground)] transition hover:bg-[#f3f0e9]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e3d9] text-[var(--accent)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{organization.name}</p>
                      <p className="text-xs text-[var(--muted)]">{organization.code}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="admin-eyebrow">No organization console</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                No active organization administrator console is available for your account. Contact the platform administrator if
                this is unexpected.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

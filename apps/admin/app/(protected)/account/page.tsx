import Link from "next/link";
import { requireAdminOrOrgAdmin } from "../../../lib/auth";
import { resolveLegacyOrg } from "../../../lib/legacy-redirect";
import { AccountPasswordForm } from "../../../components/account-password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { supabase, user, profile } = await requireAdminOrOrgAdmin();
  const resolution = await resolveLegacyOrg(user.id);
  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("id, role, status, username, organizations!organization_memberships_organization_id_fkey(name, code)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const activeMemberships = (memberships ?? []).map((membership) => {
    const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;

    return {
      id: membership.id,
      role: membership.role,
      username: membership.username,
      organizationName: organization?.name ?? "Organization",
      organizationCode: organization?.code ?? "—",
    };
  });

  const backHref =
    resolution.kind === "single"
      ? `/org/${resolution.slug}/dashboard`
      : resolution.kind === "platform"
        ? "/admin"
        : "/choose-org";

  const platformRole = profile.platform_role === "platform_admin" ? "Platform administrator" : "Organization-scoped access";

  return (
    <main className="admin-shell-bg min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="admin-eyebrow">Account</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Your Activity Log account</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Review your account details and manage your password without changing your organization memberships or roles.
            </p>
          </div>
          <Link href={backHref} className="admin-button-secondary">
            Back to console
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="admin-card space-y-5 p-6">
            <div>
              <p className="admin-eyebrow">Profile</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {profile.first_name} {profile.last_name}
              </h2>
            </div>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="admin-field-label">Email</dt>
                <dd className="mt-2 text-[var(--foreground)]">{profile.email || user.email || "—"}</dd>
              </div>
              <div>
                <dt className="admin-field-label">Platform access</dt>
                <dd className="mt-2 text-[var(--foreground)]">{platformRole}</dd>
              </div>
            </dl>

            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <p className="admin-field-label">Organization context</p>
              {activeMemberships.length ? (
                activeMemberships.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border border-[var(--border)] bg-white/75 px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{membership.organizationName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {membership.organizationCode} · {membership.role.replace("_", " ")} · username {membership.username}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-[var(--muted)]">No active organization memberships are attached to this account.</p>
              )}
            </div>
          </div>

          <section className="admin-card space-y-5 p-6">
            <div>
              <p className="admin-eyebrow">Password</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Change your password</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                We verify your current password before applying a global password change for this Activity Log account.
              </p>
            </div>

            <AccountPasswordForm />
          </section>
        </section>
      </div>
    </main>
  );
}

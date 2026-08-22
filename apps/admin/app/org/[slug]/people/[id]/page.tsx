import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";
import { OrgCredentialsPanel } from "../../../../../components/org-credentials-panel";
import { PersonForm } from "../../../../../components/person-form";
import { requireOrgAdmin } from "../../../../../lib/org-auth";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

export default async function OrgPeopleDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { organization } = await requireOrgAdmin(slug);

  const supabase = await createSupabaseServerClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, username, role, status")
    .eq("organization_id", organization.id)
    .eq("user_id", id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href={`/org/${slug}/people`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to people
        </Link>
      </div>

      <div>
        <p className="admin-eyebrow">{organization.code}</p>
        <h1 className="admin-page-title mt-3">{profile.first_name} {profile.last_name}</h1>
        <p className="admin-page-subtitle mt-2">
          {membership.username} · {membership.role.replace("_", " ")} · {membership.status}
        </p>
      </div>

      <PersonForm
        mode="edit"
        slug={slug}
        person={{
          id: profile.id,
          username: membership.username,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          status: membership.status as "active" | "inactive",
        }}
      />

      <div className="admin-card p-6">
        <div className="flex items-center gap-2.5">
          <KeyRound className="h-4 w-4 text-[var(--muted)]" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Credentials</h2>
        </div>
        <OrgCredentialsPanel slug={slug} personId={profile.id} />
      </div>
    </section>
  );
}

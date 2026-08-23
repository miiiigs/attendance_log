import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PersonForm } from "../../../../../components/person-form";
import { requireOrgAdmin } from "../../../../../lib/org-auth";

export default async function OrgPeopleNewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireOrgAdmin(slug);

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
        <h1 className="admin-page-title mt-3">Add person</h1>
        <p className="admin-page-subtitle mt-2">Register a new member for {organization.name}.</p>
      </div>

      <PersonForm mode="create" slug={slug} />
    </section>
  );
}

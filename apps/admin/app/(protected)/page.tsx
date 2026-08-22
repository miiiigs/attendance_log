import { redirect } from "next/navigation";
import { requireAdminOrOrgAdmin, resolveDefaultOrgSlug } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function HomeRedirectPage() {
  const { supabase, profile } = await requireAdminOrOrgAdmin();

  if (profile.platform_role === "platform_admin") {
    redirect("/admin");
  }

  const slug = await resolveDefaultOrgSlug(supabase);
  if (slug) {
    redirect(`/org/${slug}/dashboard`);
  }

  redirect("/admin");
}

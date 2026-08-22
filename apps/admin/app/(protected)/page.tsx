import { redirect } from "next/navigation";
import { requireAdminOrOrgAdmin } from "../../lib/auth";
import { resolveLegacyOrg } from "../../lib/legacy-redirect";

export const dynamic = "force-dynamic";

export default async function HomeRedirectPage() {
  await requireAdminOrOrgAdmin();
  const resolution = await resolveLegacyOrg();

  if (resolution.kind === "single") {
    redirect(`/org/${resolution.slug}/dashboard`);
  }

  if (resolution.kind === "platform") {
    redirect("/admin");
  }

  redirect("/choose-org");
}

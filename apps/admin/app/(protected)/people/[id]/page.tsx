import { redirect } from "next/navigation";
import { resolveLegacyOrg } from "../../../../lib/legacy-redirect";

export const dynamic = "force-dynamic";

export default async function PeopleDetailLegacyRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolution = await resolveLegacyOrg();

  if (resolution.kind === "single") {
    redirect(`/org/${resolution.slug}/people/${id}`);
  }

  if (resolution.kind === "platform") {
    redirect("/admin");
  }

  redirect("/choose-org");
}

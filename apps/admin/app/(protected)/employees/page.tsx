import { redirect } from "next/navigation";
import { resolveLegacyOrg } from "../../../lib/legacy-redirect";

export const dynamic = "force-dynamic";

export default async function EmployeesLegacyRedirectPage() {
  const resolution = await resolveLegacyOrg();

  if (resolution.kind === "single") {
    redirect(`/org/${resolution.slug}/people`);
  }

  if (resolution.kind === "platform") {
    redirect("/admin");
  }

  redirect("/choose-org");
}

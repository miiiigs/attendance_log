import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DeleteAccountPage from "./page";

describe("/delete-account", () => {
  it("renders a public deletion request page without exposing service credentials", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret-test-value";

    const html = renderToStaticMarkup(<DeleteAccountPage />);

    expect(html).toContain("Request deletion of your QRLog account");
    expect(html).toContain("Email address");
    expect(html).toContain("Request account deletion");
    expect(html).toContain("/privacy");
    expect(html).toContain("do not reveal whether an email address is associated with an account");
    expect(html).not.toContain("service-role-secret-test-value");
  });
});

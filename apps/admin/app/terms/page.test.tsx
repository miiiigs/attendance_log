import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TermsPage from "./page";

describe("/terms", () => {
  it("renders public Terms and Acceptable Use content", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret-test-value";

    const html = renderToStaticMarkup(<TermsPage />);

    expect(html).toContain("QRLog Terms of Use");
    expect(html).toContain("Effective September 5, 2026");
    expect(html).toContain("Acceptable Use / UGC Rules");
    expect(html).toContain("child sexual abuse");
    expect(html).toContain("Google Play policy");
    expect(html).toContain("report objectionable Activity content or organizers");
    expect(html).toContain("jmh.leysa@gmail.com");
    expect(html).not.toContain("service-role-secret-test-value");
  });
});

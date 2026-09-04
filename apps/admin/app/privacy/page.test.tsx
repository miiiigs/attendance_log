import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./page";

describe("/privacy", () => {
  it("renders the public QRLog Privacy Policy content without service credentials", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret-test-value";

    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(html).toContain("QRLog Privacy Policy");
    expect(html).toContain("Effective September 5, 2026");
    expect(html).toContain("/delete-account");
    expect(html).toContain("Supabase");
    expect(html).toContain("Vercel");
    expect(html).toContain("Google Sign-In");
    expect(html).toContain("jmh.leysa@gmail.com");
    expect(html).not.toContain("service-role-secret-test-value");
  });
});

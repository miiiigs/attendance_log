import { describe, expect, it } from "vitest";
import { QRLOG_DELETE_ACCOUNT_URL, QRLOG_PRIVACY_POLICY_URL, QRLOG_TERMS_URL } from "./compliance-links";

describe("QRLog compliance links", () => {
  it("uses canonical public QRLog URLs", () => {
    expect(QRLOG_PRIVACY_POLICY_URL).toBe("https://qrlogph.vercel.app/privacy");
    expect(QRLOG_DELETE_ACCOUNT_URL).toBe("https://qrlogph.vercel.app/delete-account");
    expect(QRLOG_TERMS_URL).toBe("https://qrlogph.vercel.app/terms");
  });
});

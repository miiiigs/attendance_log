import { expect, test } from "@playwright/test";
import { e2eIdentities, e2ePlatformApplication } from "./env";

test.describe.serial("Platform admin organization approval flow", () => {
  test("public application can be approved, inspected, suspended, and reactivated", async ({ page }) => {
    await page.goto("/apply");
    await page.locator("#organizationName").fill(e2ePlatformApplication.organizationName);
    await page.locator("#contactFirstName").fill(e2ePlatformApplication.contactFirstName);
    await page.locator("#contactLastName").fill(e2ePlatformApplication.contactLastName);
    await page.locator("#contactEmail").fill(e2ePlatformApplication.contactEmail);
    await page.locator("#organizationType").fill(e2ePlatformApplication.organizationType);
    await page.locator("#estimatedMemberCount").fill(e2ePlatformApplication.estimatedMemberCount);
    await page.locator("#message").fill(e2ePlatformApplication.message);
    await page.getByRole("button", { name: "Submit Application" }).click();

    await expect(page.getByRole("heading", { name: "Your request is now in the review queue." })).toBeVisible();

    await page.goto("/login");
    await page.locator("#identifier").fill(e2eIdentities.platformAdmin.username);
    await page.locator("#password").fill(e2eIdentities.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/admin");
    await expect(page.getByRole("heading", { name: "Run every organization from one secure control layer" })).toBeVisible();

    await page.goto(`/admin/applications?status=pending&query=${encodeURIComponent(e2ePlatformApplication.organizationName)}`);
    const applicationCard = page.locator("article").filter({ hasText: e2ePlatformApplication.organizationName }).first();
    await expect(applicationCard).toBeVisible();
    await applicationCard.getByRole("button", { name: "Review" }).click();
    await applicationCard.getByLabel("Organization Code").fill(e2ePlatformApplication.organizationCode);
    await applicationCard.getByLabel("Timezone").fill("Asia/Manila");
    await applicationCard.getByRole("button", { name: "Approve Organization" }).click();

    await expect(applicationCard).toContainText("Organization approved.");
    await expect(applicationCard).toContainText(e2ePlatformApplication.organizationCode);
    await expect(applicationCard).toContainText("E2EC_admin_1");

    await page.goto(`/admin/organizations?status=active&query=${encodeURIComponent(e2ePlatformApplication.organizationCode)}`);
    await expect(page.getByText(e2ePlatformApplication.organizationName)).toBeVisible();
    await page.getByRole("link", { name: "View" }).first().click();

    await expect(page.getByRole("heading", { name: e2ePlatformApplication.organizationName })).toBeVisible();
    await expect(page.getByText("E2EC_admin_1")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Suspend" }).first().click();
    await expect(page.getByText("suspended", { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reactivate" }).first().click();
    await expect(page.getByText("active", { exact: true })).toBeVisible();
  });
});

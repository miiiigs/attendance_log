import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { e2eEnv, e2eIdentities, e2eOrgCodes } from "./env";

const password = e2eIdentities.password;

function memberRow(page: import("@playwright/test").Page) {
  return page.getByRole("cell", { name: e2eIdentities.member.username }).locator("..");
}

test.describe.serial("Activity Log organization flow (local Supabase)", () => {
  test("org admin runs the activity lifecycle; member logs in/out; cross-org scan rejected", async ({ page, request }) => {
    // ------------------------------------------------------------------
    // 1. Org admin authenticates through the real login form.
    // ------------------------------------------------------------------
    await page.goto("/login");
    await page.locator("#identifier").fill(e2eIdentities.admin.username);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/org/e2ea/dashboard");
    await expect(page.getByRole("heading", { name: "Organization dashboard" })).toBeVisible();

    // Legacy organization-admin routes redirect to the organization console.
    await page.goto("/attendance");
    await expect(page).toHaveURL(/\/org\/e2ea\/activities$/);
    await page.goto("/qr");
    await expect(page).toHaveURL(/\/org\/e2ea\/current-activity$/);
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/org\/e2ea\/people$/);
    await page.goto("/org/e2ea/current-activity");

    // ------------------------------------------------------------------
    // 2. Start an activity; QR is generated automatically.
    // ------------------------------------------------------------------
    await page.goto("/org/e2ea/current-activity");
    await page.getByPlaceholder("e.g. General Assembly").fill("E2E Test Activity");
    await page.getByTestId("start-activity-submit").click();

    await expect(page.getByRole("heading", { name: "E2E Test Activity" })).toBeVisible();
    await expect(page.getByText("In progress")).toBeVisible();
    await expect(page.getByText("Expires")).toBeVisible();

    // ------------------------------------------------------------------
    // 3. Capture the raw QR token (kept in an httpOnly admin cookie).
    // ------------------------------------------------------------------
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((cookie) => cookie.name.startsWith("activity_qr_token_"));
    expect(tokenCookie, "admin QR token cookie should be set").toBeTruthy();
    const qrToken = tokenCookie!.value;

    // ------------------------------------------------------------------
    // 4. Member authenticates through the real organization-aware login
    //    endpoint, then performs the first scan (Time In).
    // ------------------------------------------------------------------
    const memberLogin = await request.post("/api/auth/mobile-login", {
      data: {
        organizationCode: e2eOrgCodes.primary,
        username: e2eIdentities.member.username,
        password,
      },
    });
    expect(memberLogin.ok()).toBeTruthy();
    const memberSession = await memberLogin.json();
    expect(memberSession.organization.code).toBe(e2eOrgCodes.primary);
    expect(memberSession.membership.username).toBe(e2eIdentities.member.username);
    expect(memberSession.access_token).toBeTruthy();

    const scanClient = createClient(e2eEnv.supabaseUrl, memberSession.access_token, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const timeIn = await scanClient.rpc("scan_activity", { qr_token: qrToken });
    expect(timeIn.error, JSON.stringify(timeIn.error)).toBeNull();
    const timeInRow = Array.isArray(timeIn.data) ? timeIn.data[0] : timeIn.data;
    expect(timeInRow.scan_type).toBe("time_in");

    // ------------------------------------------------------------------
    // 5. Org admin refreshes and sees the member as Logged.
    // ------------------------------------------------------------------
    await page.reload();
    await expect(memberRow(page).getByText("Logged")).toBeVisible();

    // ------------------------------------------------------------------
    // 6. Member performs the second scan (Time Out).
    // ------------------------------------------------------------------
    const timeOut = await scanClient.rpc("scan_activity", { qr_token: qrToken });
    expect(timeOut.error, JSON.stringify(timeOut.error)).toBeNull();
    const timeOutRow = Array.isArray(timeOut.data) ? timeOut.data[0] : timeOut.data;
    expect(timeOutRow.scan_type).toBe("time_out");

    await page.reload();
    await expect(memberRow(page).getByText("Completed")).toBeVisible();

    // ------------------------------------------------------------------
    // 7. Negative tenant case: an Org B member cannot scan the E2EA QR.
    // ------------------------------------------------------------------
    const memberBLogin = await request.post("/api/auth/mobile-login", {
      data: {
        organizationCode: e2eOrgCodes.orgB,
        username: e2eIdentities.memberB.username,
        password,
      },
    });
    expect(memberBLogin.ok()).toBeTruthy();
    const memberBSession = await memberBLogin.json();

    const crossTenantClient = createClient(e2eEnv.supabaseUrl, memberBSession.access_token, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const crossTenant = await crossTenantClient.rpc("scan_activity", { qr_token: qrToken });
    expect(crossTenant.error).not.toBeNull();
    expect(String(crossTenant.error?.message ?? "")).toContain("QR code does not belong to your organization.");

    // ------------------------------------------------------------------
    // 8. Org admin ends the activity; QR stops working; history preserved.
    // ------------------------------------------------------------------
    await page.goto("/org/e2ea/current-activity");
    await page.getByTestId("end-activity-trigger").click();
    await page.getByTestId("end-activity-confirm").click();

    await page.waitForURL(/\/org\/e2ea\/activities\/[0-9a-f-]+$/);
    await expect(page.getByText("ended", { exact: true })).toBeVisible();
    await expect(memberRow(page).getByText("Completed")).toBeVisible();

    const afterEnd = await scanClient.rpc("scan_activity", { qr_token: qrToken });
    expect(afterEnd.error).not.toBeNull();
    expect(String(afterEnd.error?.message ?? "")).toContain("QR code has expired.");
  });
});

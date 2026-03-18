import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to Shipforge" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("auth providers endpoint includes credentials", async ({ request }) => {
  const response = await request.get("/api/auth/providers");
  expect(response.status()).toBe(200);

  const providers = await response.json();
  expect(providers.credentials).toBeTruthy();
});

test("session endpoint returns object", async ({ request }) => {
  const response = await request.get("/api/auth/session");
  expect(response.status()).toBe(200);

  const session = await response.json();
  expect(typeof session).toBe("object");
});

test("invalid credentials show error", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, "Requires DATABASE_URL to run credentials flow.");

  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("invalid-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

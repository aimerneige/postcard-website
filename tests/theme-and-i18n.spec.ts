import { test, expect } from "@playwright/test";

test("theme switching: toggles between dark, light, and system with persistence", async ({
  page,
}) => {
  await page.goto("/");

  // Default theme should have data-theme attribute set (either light or dark depending on system)
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  expect(["light", "dark"]).toContain(initialTheme);

  // Switch to dark theme
  const themeSelect = page.getByLabel("切换主题");
  await themeSelect.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const metaDark = await page
    .locator('meta[name="theme-color"]')
    .getAttribute("content");
  expect(metaDark).toBe("#141715");

  // Verify persistence across reload
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("切换主题")).toHaveValue("dark");

  // Switch to light theme
  await page.getByLabel("切换主题").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const metaLight = await page
    .locator('meta[name="theme-color"]')
    .getAttribute("content");
  expect(metaLight).toBe("#f7f8f2");

  // Verify persistence across reload
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByLabel("切换主题")).toHaveValue("light");
});

test("i18n switching: translates between Chinese, English, and Japanese with persistence", async ({
  page,
}) => {
  await page.goto("/");

  // Initial Chinese language checks
  await expect(page.locator(".brand strong")).toHaveText("片刻");
  await expect(page.getByRole("button", { name: "选择本地图片" })).toBeVisible();
  await expect(page.getByLabel("左侧文字")).toBeVisible();
  await expect(page.getByLabel("添加文字与白条")).toBeChecked();
  expect(await page.title()).toBe("片刻 · 明信片生成器");
  expect(await page.locator("html").getAttribute("lang")).toBe("zh-CN");

  // Switch to English
  await page.getByLabel("选择语言").selectOption("en");
  await expect(page.locator(".brand strong")).toHaveText("Moment");
  await expect(page.getByRole("button", { name: "Choose Local Image" })).toBeVisible();
  await expect(page.getByLabel("Left Text")).toBeVisible();
  await expect(page.getByLabel("Add Text & White Strip")).toBeChecked();
  await expect(page.getByRole("button", { name: /Download PNG/ })).toBeDisabled();
  expect(await page.title()).toBe("Moment · Postcard Generator");
  expect(await page.locator("html").getAttribute("lang")).toBe("en");

  // Verify English persistence across reload
  await page.reload();
  await expect(page.locator(".brand strong")).toHaveText("Moment");
  await expect(page.getByRole("button", { name: "Choose Local Image" })).toBeVisible();
  await expect(page.getByLabel("Left Text")).toBeVisible();

  // Switch to Japanese
  await page.getByLabel("Language").selectOption("ja");
  await expect(page.locator(".brand strong")).toHaveText("片刻");
  await expect(page.getByRole("button", { name: "画像を選択" })).toBeVisible();
  await expect(page.getByLabel("左側のテキスト")).toBeVisible();
  await expect(page.getByLabel("テキストと白帯を追加")).toBeChecked();
  await expect(page.getByRole("button", { name: /PNGをダウンロード/ })).toBeDisabled();
  expect(await page.title()).toBe("片刻 · ポストカードジェネレーター");
  expect(await page.locator("html").getAttribute("lang")).toBe("ja");

  // Verify Japanese persistence across reload
  await page.reload();
  await expect(page.getByRole("button", { name: "画像を選択" })).toBeVisible();
  await expect(page.getByLabel("左側のテキスト")).toBeVisible();

  // Switch back to Chinese
  await page.getByLabel("言語選択").selectOption("zh");
  await expect(page.getByRole("button", { name: "选择本地图片" })).toBeVisible();
  await expect(page.getByLabel("左侧文字")).toBeVisible();
  expect(await page.title()).toBe("片刻 · 明信片生成器");
});

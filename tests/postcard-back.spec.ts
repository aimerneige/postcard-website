import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";

test("postcard back design: customization, preview switching and export", async ({
  page,
}) => {
  await page.goto("/");

  // Verify initial state: Front side active
  await expect(
    page.getByRole("tab", { name: "正面", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("正面预览")).toBeVisible();

  // Switch to Back side via preview header
  await page.getByRole("tab", { name: "背面", exact: true }).click();
  await expect(page.getByText("背面预览")).toBeVisible();
  await expect(page.getByLabel("背面预览")).toBeVisible();

  // Back side controls should be visible in editor
  await expect(page.getByLabel("正上方文字")).toHaveValue("POST CARD");
  await expect(page.getByLabel("正上方副标题")).toHaveValue("CARTE POSTALE");
  await expect(page.getByLabel("右上角邮票标志")).toBeChecked();
  await expect(page.getByLabel("中间竖线分隔")).toBeChecked();
  await expect(page.getByLabel("右侧地址区")).toBeChecked();
  await expect(page.getByLabel("左侧图片")).not.toBeChecked();
  await expect(page.getByLabel("左下角小文字")).toHaveValue("片刻 · 留住此刻风景");
  await expect(page.getByLabel("右下角小文字")).toHaveValue("DESIGNED WITH MOMENT");

  // Modify back design controls
  await page.getByLabel("正上方文字").fill("GREETINGS FROM MOMENT");
  await page.getByLabel("正上方副标题").fill("UNIVERSAL POSTAL CARD");
  await page.getByLabel("左下角小文字").fill("PHOTO BY AI");
  await page.getByLabel("右下角小文字").fill("MOMENT NO. 42");

  // Toggle stamp text
  await expect(page.getByLabel("邮票文字")).toHaveValue("STAMP");
  await page.getByLabel("邮票文字").fill("AIR MAIL");

  // Toggle left image
  await page.getByLabel("左侧图片").check();
  await expect(
    page.getByRole("button", { name: "选择左侧图片" }),
  ).toBeVisible();

  // Upload back image
  const backImageInput = page.getByTestId("back-file-input");
  await backImageInput.setInputFiles("tests/fixtures/photo.jpg");
  await expect(page.getByRole("button", { name: "更换图片" })).toBeVisible();
  await expect(page.getByRole("button", { name: "移除图片" })).toBeVisible();

  // Export back only
  await page.getByLabel("导出范围").selectOption("back");
  const dlPngPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /下载 PNG/ }).click();
  const downloadPng = await dlPngPromise;
  expect(downloadPng.suggestedFilename()).toBe("postcard-back.png");

  // Export PDF back only
  const dlPdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /下载打印 PDF/ }).click();
  const downloadPdf = await dlPdfPromise;
  expect(downloadPdf.suggestedFilename()).toBe("postcard-back.pdf");
  const pdfBytes = readFileSync((await downloadPdf.path())!);
  const pdf = await PDFDocument.load(pdfBytes);
  expect(pdf.getPageCount()).toBe(1);

  // Switch to Front and upload front image
  await page.getByRole("tab", { name: "正面", exact: true }).click();
  await expect(page.getByText("正面预览")).toBeVisible();
  const frontInput = page.getByTestId("file-input");
  await frontInput.setInputFiles("tests/fixtures/photo.jpg");

  // Export double-sided PDF (both front and back)
  await page.getByLabel("导出范围").selectOption("both");
  const dlBothPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /下载打印 PDF/ }).click();
  // Low PPI dialog shows because photo.jpg is 263 PPI < 300 PPI
  await page.getByRole("button", { name: "仍然下载 PDF" }).click();
  const downloadBoth = await dlBothPromise;
  const bothBytes = readFileSync((await downloadBoth.path())!);
  const bothPdf = await PDFDocument.load(bothBytes);
  expect(bothPdf.getPageCount()).toBe(2);
});

test("postcard back: presets, top-left postal code toggle, and address customization", async ({
  page,
}) => {
  await page.goto("/");

  // Switch to Back side
  await page.getByRole("tab", { name: "背面", exact: true }).click();
  await expect(page.getByText("背面预览")).toBeVisible();

  // Test International Preset: should disable postal code boxes and configure clean layout
  await page.getByRole("button", { name: /国际通用/ }).click();
  await expect(page.getByLabel(/邮政编码方框/)).not.toBeChecked();
  await expect(page.getByLabel("正上方文字")).toHaveValue("POST CARD");
  await expect(page.getByLabel("正上方副标题")).toHaveValue("CARTE POSTALE");
  await expect(page.getByLabel("邮票文字")).toHaveValue("AIR MAIL");
  await expect(page.getByLabel("地址横线数")).toHaveValue("3");
  await expect(page.getByLabel("收件人前缀")).toHaveValue("To.");

  // Test China Post Preset: should enable postal code boxes in top-left, apply Chinese font, and omit top text to avoid collision
  await page.getByRole("button", { name: /国内标准/ }).click();
  await expect(page.getByLabel(/邮政编码方框/)).toBeChecked();
  await expect(page.getByLabel("正上方文字")).not.toBeVisible();
  await expect(page.getByLabel("正上方副标题")).not.toBeVisible();
  await expect(page.getByLabel("地址横线数")).toHaveValue("4");
  await expect(page.getByLabel("收件人前缀")).toHaveValue("收件人：");
  await expect(page.getByLabel("明信片字体")).toHaveValue("noto-serif");

  // Switch to brush calligraphy font on back side
  await page.getByLabel("明信片字体").selectOption("ma-shan-zheng");
  await expect(page.getByLabel("明信片字体")).toHaveValue("ma-shan-zheng");

  // Test Minimalist Preset: should disable postal code and set 0 address lines (blank space)
  await page.getByRole("button", { name: /极简开阔/ }).click();
  await expect(page.getByLabel(/邮政编码方框/)).not.toBeChecked();
  await expect(page.getByLabel("正上方文字")).toBeVisible();
  await expect(page.getByLabel("正上方副标题")).toHaveValue("");
  await expect(page.getByLabel("地址横线数")).toHaveValue("0");

  // Test custom address line customization
  await page.getByLabel("地址横线数").selectOption("5");
  await expect(page.getByLabel("收件人前缀")).toBeVisible();
  await page.getByLabel("收件人前缀").fill("Dear Friend:");

  // Select spacing: compact
  await page.getByText(/紧凑/).click();

  // Select style: dashed
  await page.getByText("虚线").click();

  // Export back only with customized layout
  await page.getByLabel("导出范围").selectOption("back");
  const dlPngPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /下载 PNG/ }).click();
  const downloadPng = await dlPngPromise;
  expect(downloadPng.suggestedFilename()).toBe("postcard-back.png");
});

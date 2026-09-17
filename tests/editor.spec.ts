import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
test("local editor, rejection, composition, downloads and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByLabel("左侧文字")).toHaveValue("");
  await expect(page.getByLabel("右侧文字")).toHaveValue("");
  await expect(page.getByLabel("添加文字与白条")).toBeChecked();
  await page.getByLabel("添加文字与白条").uncheck();
  await expect(page.getByLabel("白条不透明度")).toBeHidden();
  await expect(page.getByLabel("左侧文字")).toBeHidden();
  await expect(
    page.getByText("已关闭，导出时不会绘制文字与白条"),
  ).toBeVisible();
  await page.getByLabel("添加文字与白条").check();
  await expect(page.getByLabel("白条不透明度")).toBeVisible();
  const desktopWorkspace = await page.evaluate(() => {
    const editor = document.querySelector<HTMLElement>(".editor")!;
    const preview = document.querySelector<HTMLElement>(".preview-stage")!;
    const previewTop = preview.getBoundingClientRect().top;
    editor.scrollTop = editor.scrollHeight;
    return {
      editorScrolls: editor.scrollHeight > editor.clientHeight,
      editorHeight: editor.getBoundingClientRect().height,
      previewStayedPut: preview.getBoundingClientRect().top === previewTop,
      viewportHeight: innerHeight,
    };
  });
  expect(desktopWorkspace.editorScrolls).toBe(true);
  expect(desktopWorkspace.editorHeight).toBeLessThan(
    desktopWorkspace.viewportHeight,
  );
  expect(desktopWorkspace.previewStayedPut).toBe(true);
  await page.locator(".editor").evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeDisabled();
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await page.screenshot({ path: ".local/desktop.png", fullPage: true });
  const input = page.getByTestId("file-input");
  await input.setInputFiles("tests/fixtures/photo.jpg");
  await expect(page.getByText("有效分辨率 263 PPI")).toBeVisible();
  await page.getByLabel("左侧文字").fill("Hello · 你好");
  await page.getByLabel("白条不透明度").fill("65");
  await page.getByLabel("图片缩放").fill("200");
  await expect(page.getByText("有效分辨率 131 PPI")).toBeVisible();
  await page.getByRole("button", { name: "旋转 90°" }).click();
  await expect(page.getByLabel("图片缩放")).toHaveValue("200");
  await page.getByRole("button", { name: "恢复构图" }).click();
  await expect(page.getByLabel("图片缩放")).toHaveValue("100");
  await expect(page.getByLabel("左侧文字")).toHaveValue("Hello · 你好");
  await expect(page.getByLabel("白条不透明度")).toHaveValue("65");
  for (const name of ["animated.png", "animated.webp"]) {
    await input.setInputFiles(`tests/fixtures/${name}`);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("有效分辨率 263 PPI")).toBeVisible();
  }
  await input.setInputFiles({
    name: "fake.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: /下载 PNG/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "返回调整" }).click();
  for (const format of ["PNG", "PDF"]) {
    await page
      .getByRole("button", {
        name: format === "PNG" ? /下载 PNG/ : /下载打印 PDF/,
      })
      .click();
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: `仍然下载 ${format}` }).click();
    const file = await dl;
    await file.saveAs(`.local/export.${format.toLowerCase()}`);
    const bytes = readFileSync(`.local/export.${format.toLowerCase()}`);
    if (format === "PNG") {
      expect(bytes.readUInt32BE(16)).toBe(1748);
      expect(bytes.readUInt32BE(20)).toBe(1240);
    } else {
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo((148 / 25.4) * 72, 5);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo((105 / 25.4) * 72, 5);
    }
  }
  await page.screenshot({ path: ".local/with-image.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".local/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("EXIF normalization, transparency, keyboard pan, resizing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  for (let n = 1; n <= 8; n++) {
    await page
      .getByTestId("file-input")
      .setInputFiles(`tests/fixtures/exif-${n}.jpg`);
    await expect(
      page.getByText(
        `原始像素（方向归一化）：${n >= 5 ? "200 × 400" : "400 × 200"}`,
        { exact: true },
      ),
    ).toBeVisible();
  }
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/transparent.png");
  await expect(
    page.getByText("原始像素（方向归一化）：1480 × 1050"),
  ).toBeVisible();
  await page.waitForTimeout(100);
  expect(
    await page
      .locator("canvas")
      .evaluate((c: HTMLCanvasElement) =>
        Array.from(c.getContext("2d")!.getImageData(10, 10, 1, 1).data),
      ),
  ).toEqual([255, 255, 255, 255]);
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/photo.jpg");
  await expect(page.getByText("有效分辨率 263 PPI")).toBeVisible();
  const before = await page
    .locator("canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.locator("canvas").press("ArrowLeft");
  await page.waitForTimeout(100);
  expect(
    await page
      .locator("canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(before);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByText("有效分辨率 263 PPI")).toBeVisible();
});

test("identical dist works at repository subpath including lazy PDF export", async ({
  page,
}) => {
  const failed: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  await page.goto("/postcard/");
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/photo.jpg");
  await expect(page.getByText("有效分辨率 263 PPI")).toBeVisible();
  await page.getByRole("button", { name: /下载打印 PDF/ }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "仍然下载 PDF" }).click();
  await dl;
  expect(failed).toEqual([]);
});

test("multiple drops and oversized files preserve current edit; valid replacement resets only crop", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/photo.jpg");
  await expect(page.getByText("有效分辨率 263 PPI")).toBeVisible();
  await page.getByLabel("左侧文字").fill("保留这段文字");
  await page.getByLabel("图片缩放").fill("200");
  await page.locator(".preview-stage").evaluate((el) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["one"], "one.jpg"));
    transfer.items.add(new File(["two"], "two.jpg"));
    el.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
    );
  });
  await expect(page.getByRole("alert")).toContainText("一次只选择一张");
  await page.locator(".preview-stage").evaluate((el) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(30 * 1024 * 1024 + 1)], "large.jpg"),
    );
    el.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
    );
  });
  await expect(page.getByRole("alert")).toContainText("30 MiB");
  await expect(page.getByLabel("图片缩放")).toHaveValue("200");
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/static.webp");
  await expect(page.getByLabel("图片缩放")).toHaveValue("100");
  await expect(page.getByLabel("左侧文字")).toHaveValue("保留这段文字");
});

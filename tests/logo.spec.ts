import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";

for (const orientation of ["横向", "竖向"]) {
  test(`${orientation}: transparent logo keeps its position, opacity and aspect ratio in preview and exports`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("font-status")).toContainText("已应用");
    await page.getByRole("radio", { name: orientation, exact: true }).check();
    await page
      .getByTestId("file-input")
      .setInputFiles("tests/fixtures/transparent.png");
    await page.getByLabel("添加文字与白条").uncheck();
    const image = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 200;
      c.height = 100;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "red";
      ctx.fillRect(50, 0, 100, 100);
      return c.toDataURL().split(",")[1];
    });
    await page.getByTestId("logo-file-input").setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
    await expect(page.getByLabel("Logo 不透明度")).toHaveValue("60");
    await expect(page.getByLabel("Logo 大小")).toHaveValue("15");
    const sample = (size = 15) =>
      page.locator("canvas").evaluate((c: HTMLCanvasElement, size) => {
        const W = c.width > c.height ? 1480 : 1050;
        const H = c.width > c.height ? 1050 : 1480;
        const width = (W * size) / 100;
        const height = width / 2;
        const ctx = c.getContext("2d")!;
        const pixel = (x: number, y: number) =>
          Array.from(
            ctx.getImageData(
              Math.floor((x / W) * c.width),
              Math.floor((y / H) * c.height),
              1,
              1,
            ).data,
          );
        return {
          center: pixel(W - 16 - width / 2, 16 + height / 2),
          transparent: pixel(W - 16 - width * 0.875, 16 + height / 2),
          top: pixel(W - 16 - width / 2, 4),
          right: pixel(W - 4, 16 + height / 2),
          below: pixel(W - 16 - width / 2, 16 + height + 4),
        };
      }, size);
    await expect
      .poll(async () => (await sample()).center)
      .toEqual([255, 102, 102, 255]);
    const preview = await sample();
    for (const name of ["transparent", "top", "right", "below"] as const)
      expect(preview[name]).toEqual([255, 255, 255, 255]);
    await page.getByLabel("Logo 不透明度").fill("25");
    await page.getByLabel("Logo 大小").fill("30");
    await expect
      .poll(async () => (await sample(30)).center)
      .toEqual([255, 191, 191, 255]);
    await page.getByLabel("导出清晰度").selectOption("600");
    const files: Record<string, Buffer> = {};
    for (const format of ["PNG", "PDF"]) {
      const promise = page.waitForEvent("download");
      await page
        .getByRole("button", {
          name: format === "PNG" ? /下载 PNG/ : /下载打印 PDF/,
        })
        .click();
      await page.getByRole("button", { name: `仍然下载 ${format}` }).click();
      files[format] = readFileSync((await (await promise).path())!);
    }
    const exported = await page.evaluate(
      async (data) => {
        const bitmap = await createImageBitmap(
          await (await fetch(data)).blob(),
        );
        const c = document.createElement("canvas");
        c.width = bitmap.width;
        c.height = bitmap.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const W = c.width > c.height ? 1480 : 1050;
        const H = c.width > c.height ? 1050 : 1480;
        const x = Math.floor(((W - 16 - (W * 0.3) / 2) / W) * c.width);
        const y = Math.floor(((16 + (W * 0.3) / 4) / H) * c.height);
        return {
          x,
          y,
          width: c.width,
          pixel: Array.from(ctx.getImageData(x, y, 1, 1).data),
        };
      },
      `data:image/png;base64,${files.PNG.toString("base64")}`,
    );
    expect(exported.pixel).toEqual([255, 191, 191, 255]);
    const pdf = await PDFDocument.load(files.PDF);
    const images = pdf.context
      .enumerateIndirectObjects()
      .map(([, obj]) => obj)
      .filter(
        (obj): obj is PDFRawStream =>
          obj instanceof PDFRawStream &&
          obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"),
      );
    expect(images).toHaveLength(1);
    const rgb = decodePDFRawStream(images[0]).decode();
    const offset = (exported.y * exported.width + exported.x) * 3;
    expect(Array.from(rgb.slice(offset, offset + 3))).toEqual([255, 191, 191]);

    await page.getByTestId("logo-file-input").setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("invalid"),
    });
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "确定", exact: true }).click();
    await expect(page.getByText("logo.png", { exact: true })).toBeVisible();
    await expect
      .poll(async () => (await sample(30)).center)
      .toEqual([255, 191, 191, 255]);
    await page
      .getByTestId("file-input")
      .setInputFiles("tests/fixtures/transparent.png");
    await expect
      .poll(async () => (await sample(30)).center)
      .toEqual([255, 191, 191, 255]);
    await page.getByTestId("logo-file-input").setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
    await expect(
      page.getByText("replacement.png", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => (await sample(30)).center)
      .toEqual([255, 191, 191, 255]);
    await page.getByRole("button", { name: "移除 Logo" }).click();
    await expect(page.getByLabel("Logo 不透明度")).toBeHidden();
    await expect
      .poll(async () => (await sample(30)).center)
      .toEqual([255, 255, 255, 255]);
    expect(errors).toEqual([]);
  });
}

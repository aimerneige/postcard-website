import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";

for (const orientation of ["横向", "竖向"]) {
  test(`${orientation}: text templates preserve individual styles and export both rows`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("font-status")).toContainText("已应用");
    await page.getByRole("radio", { name: orientation, exact: true }).check();
    await page.getByRole("radio", { name: "双行模板" }).check();
    await page.getByLabel("左侧文字", { exact: true }).fill("MMMM");
    await page.getByLabel("右侧文字", { exact: true }).fill("mmmm");
    await page.getByLabel("左侧第二行文字", { exact: true }).fill("SECOND");
    await page.getByLabel("右侧第二行文字", { exact: true }).fill("2026");
    await page.getByLabel("左侧字体", { exact: true }).selectOption("lato");
    await page.getByLabel("右侧字体", { exact: true }).selectOption("lora");
    await page.getByLabel("左侧第二行字体").selectOption("caveat");
    await page.getByLabel("右侧第二行字体").selectOption("lato");
    await page.getByLabel("左侧字号", { exact: true }).fill("64");
    await page.getByLabel("右侧字号", { exact: true }).fill("24");
    await page.getByLabel("右侧第二行字号").fill("12");
    await expect(page.getByTestId("font-status")).toContainText("已应用");
    const paper = await page.locator(".postcard").boundingBox();
    const strip = await page.locator(".empty-strip").boundingBox();
    expect(strip!.height / paper!.height).toBeCloseTo(
      176 / (orientation === "横向" ? 1050 : 1480),
      3,
    );

    await page.getByRole("radio", { name: "单行模板" }).check();
    await expect(
      page.getByLabel("左侧第二行文字", { exact: true }),
    ).toBeHidden();
    await page.getByRole("radio", { name: "双行模板" }).check();
    await expect(
      page.getByLabel("左侧第二行文字", { exact: true }),
    ).toHaveValue("SECOND");
    await expect(page.getByLabel("左侧第二行字体")).toHaveValue("caveat");
    await expect(page.getByLabel("右侧第二行字号")).toHaveValue("12");
    await page
      .getByTestId("file-input")
      .setInputFiles("tests/fixtures/transparent.png");
    await page.getByLabel("白条不透明度").fill("100");
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
    const raster = await page.evaluate(
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
        const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
        const rgb = new Uint8Array(c.width * c.height * 3);
        const counts = [0, 0, 0, 0];
        const scale = c.height / (c.width > c.height ? 1050 : 1480);
        for (let i = 0, j = 0; i < rgba.length; i += 4) {
          rgb[j++] = rgba[i];
          rgb[j++] = rgba[i + 1];
          rgb[j++] = rgba[i + 2];
          const y = Math.floor(i / 4 / c.width);
          if (rgba[i] < 100 && y >= c.height - 176 * scale) {
            const row = y < c.height - 64 * scale ? 0 : 1;
            const side = (i / 4) % c.width < c.width / 2 ? 0 : 1;
            counts[row * 2 + side]++;
          }
        }
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", rgb)),
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return { counts, hash };
      },
      `data:image/png;base64,${files.PNG.toString("base64")}`,
    );
    expect(raster.counts.every((count) => count > 20)).toBe(true);
    expect(raster.counts[0]).toBeGreaterThan(raster.counts[1]);
    expect(raster.counts[2]).toBeGreaterThan(raster.counts[3]);
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
    expect(
      createHash("sha256")
        .update(decodePDFRawStream(images[0]).decode())
        .digest("hex"),
    ).toBe(raster.hash);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("second-row overlap uses independent sizes and font failures block export until retry", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await page.getByRole("radio", { name: "双行模板" }).check();
  await page.getByLabel("左侧第二行文字", { exact: true }).fill("M".repeat(20));
  await page.getByLabel("右侧第二行文字", { exact: true }).fill("M".repeat(20));
  await page.getByLabel("左侧第二行字号").fill("96");
  await expect(page.locator(".text-overflow")).toBeVisible();
  await page.getByLabel("左侧第二行字号").fill("12");
  await expect(page.locator(".text-overflow")).toBeHidden();
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/photo.jpg");
  await page.route("**/Lora*.ttf", (route) => route.abort());
  await page.getByLabel("左侧第二行字体").selectOption("lora");
  await expect(page.getByTestId("font-status")).toContainText("字体加载失败");
  await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeDisabled();
  await page.unroute("**/Lora*.ttf");
  await page.getByRole("button", { name: "重新加载字体" }).click();
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeEnabled();
  await expect(page.getByLabel("右侧字体", { exact: true })).toHaveValue("");
});

test("deleting a custom font resets only the lines using it", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await expect(
    page.getByRole("button", { name: "上传本地字体" }),
  ).toBeEnabled();
  await page.getByTestId("font-file-input").setInputFiles({
    name: "Line Font.ttf",
    mimeType: "font/ttf",
    buffer: readFileSync("src/assets/fonts/Lato-Regular.ttf"),
  });
  await expect(page.getByTestId("font-status")).toContainText(
    "已应用：Line Font",
  );
  const customId = await page.getByLabel("明信片字体").inputValue();
  await page.getByLabel("左侧字体", { exact: true }).selectOption(customId);
  await page.getByLabel("明信片字体").selectOption("irohamaru");
  await page.getByLabel("右侧字体", { exact: true }).selectOption("caveat");
  await page
    .getByRole("button", { name: "删除字体 Line Font", exact: true })
    .click();
  await expect(page.getByLabel("左侧字体", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("右侧字体", { exact: true })).toHaveValue(
    "caveat",
  );
  await expect(page.getByTestId("font-status")).toContainText("已应用");
});

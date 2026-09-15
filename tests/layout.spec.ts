import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
for (const path of ["/", "/postcard/"]) {
  test(`portrait preview and print dimensions, constant bottom strip at ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByTestId("font-status")).toContainText("已应用");
    await expect(page.getByLabel("左侧文字")).toHaveValue("");
    await expect(page.getByLabel("右侧文字")).toHaveValue("");
    await page.getByRole("radio", { name: "竖向", exact: true }).check();
    let frame = await page.locator(".postcard").boundingBox();
    expect(frame!.width / frame!.height).toBeCloseTo(105 / 148, 2);
    const strip = await page.locator(".empty-strip").boundingBox();
    expect(strip!.height / frame!.height).toBeCloseTo(64 / 1480, 3);
    await page
      .getByTestId("file-input")
      .setInputFiles("tests/fixtures/photo.jpg");
    await expect(page.getByText("有效分辨率 187 PPI")).toBeVisible();
    await page.getByLabel("白条不透明度").fill("100");
    // Use a short known label to verify preservation, then clear it for band sampling.
    await page.getByLabel("左侧文字").fill("留住片刻");
    await page.getByLabel("明信片字体").selectOption("lora");
    await expect(page.getByTestId("font-status")).toContainText("已应用");
    await page.getByLabel("图片缩放").fill("200");
    await page.getByRole("radio", { name: "横向", exact: true }).check();
    await expect(page.getByLabel("图片缩放")).toHaveValue("100");
    await expect(page.getByLabel("左侧文字")).toHaveValue("留住片刻");
    await expect(page.getByLabel("明信片字体")).toHaveValue("lora");
    await expect(page.getByLabel("白条不透明度")).toHaveValue("100");
    await page.getByLabel("左侧文字").fill("");
    const thicknesses: number[] = [];
    for (const [orientation, width, height, wmm, hmm] of [
      ["横向", 1748, 1240, 148, 105],
      ["竖向", 1240, 1748, 105, 148],
    ] as const) {
      await page.getByRole("radio", { name: orientation, exact: true }).check();
      for (const format of ["PNG", "PDF"]) {
        await page
          .getByRole("button", {
            name: format === "PNG" ? /下载 PNG/ : /下载打印 PDF/,
          })
          .click();
        const promise = page.waitForEvent("download");
        await page.getByRole("button", { name: `仍然下载 ${format}` }).click();
        const download = await promise;
        const bytes = readFileSync((await download.path())!);
        if (format === "PNG") {
          expect(bytes.readUInt32BE(16)).toBe(width);
          expect(bytes.readUInt32BE(20)).toBe(height);
          const band = await page.evaluate(
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
              let count = 0;
              for (let y = c.height - 1; y >= 0; y--) {
                const p = ctx.getImageData(
                  Math.floor(c.width / 2),
                  y,
                  1,
                  1,
                ).data;
                if (
                  p[0] === 255 &&
                  p[1] === 255 &&
                  p[2] === 255 &&
                  p[3] === 255
                )
                  count++;
                else break;
              }
              return count;
            },
            `data:image/png;base64,${bytes.toString("base64")}`,
          );
          thicknesses.push(band);
          expect(band).toBeGreaterThanOrEqual(75);
          expect(band).toBeLessThanOrEqual(76);
        } else {
          const pdf = await PDFDocument.load(bytes);
          expect(pdf.getPage(0).getWidth()).toBeCloseTo((wmm / 25.4) * 72, 5);
          expect(pdf.getPage(0).getHeight()).toBeCloseTo((hmm / 25.4) * 72, 5);
        }
      }
    }
    expect(Math.abs(thicknesses[0] - thicknesses[1])).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "旋转 90°" }).click();
    await expect(page.getByText("有效分辨率 263 PPI")).toBeVisible();
    await page.getByRole("button", { name: "恢复构图" }).click();
    await expect(page.getByText("有效分辨率 187 PPI")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    frame = await page.locator(".postcard").boundingBox();
    expect(frame!.width / frame!.height).toBeCloseTo(105 / 148, 2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/portrait${path === "/" ? "-root" : "-subpath"}.png`,
      fullPage: true,
    });
  });
}

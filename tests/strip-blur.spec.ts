import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const orientation of ["横向", "竖向"]) {
  test(`${orientation}: strip blur is clipped and scales with PNG export`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("font-status")).toContainText("已应用");
    await page.getByRole("radio", { name: orientation, exact: true }).check();
    const image = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1600;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 800, 1600);
      ctx.fillStyle = "white";
      ctx.fillRect(800, 0, 800, 1600);
      return canvas.toDataURL().split(",")[1];
    });
    await page.getByTestId("file-input").setInputFiles({
      name: "split.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
    const blur = page.getByLabel("背景高斯模糊");
    await expect(blur).toHaveValue("8");
    await page.getByLabel("白条不透明度").fill("0");
    await blur.fill("0");

    const samplePreview = () =>
      page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d")!;
        const logicalHeight = canvas.width > canvas.height ? 1050 : 1480;
        const scale = canvas.height / logicalHeight;
        const x = Math.floor(canvas.width / 2 - 4 * scale);
        return {
          strip: ctx.getImageData(
            x,
            Math.floor(canvas.height - 32 * scale),
            1,
            1,
          ).data[0],
          photo: ctx.getImageData(
            x,
            Math.floor(canvas.height - 96 * scale),
            1,
            1,
          ).data[0],
        };
      });
    await expect.poll(samplePreview).toEqual({ strip: 0, photo: 0 });
    await blur.fill("16");
    await expect
      .poll(async () => (await samplePreview()).strip)
      .toBeGreaterThan(70);
    const preview = await samplePreview();
    expect(preview.photo).toBe(0);

    for (const ppi of ["150", "600"]) {
      await page.getByLabel("导出清晰度").selectOption(ppi);
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /下载 PNG/ }).click();
      const confirmation = page.getByRole("button", { name: "仍然下载 PNG" });
      if (await confirmation.isVisible()) await confirmation.click();
      const download = await downloadPromise;
      const bytes = readFileSync((await download.path())!);
      const pixels = await page.evaluate(
        async (data) => {
          const bitmap = await createImageBitmap(
            await (await fetch(data)).blob(),
          );
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const scale =
            canvas.height / (canvas.width > canvas.height ? 1050 : 1480);
          const x = Math.floor(canvas.width / 2 - 4 * scale);
          return {
            strip: Array.from(
              ctx.getImageData(x, Math.floor(canvas.height - 32 * scale), 1, 1)
                .data,
            ),
            photo: Array.from(
              ctx.getImageData(x, Math.floor(canvas.height - 96 * scale), 1, 1)
                .data,
            ),
          };
        },
        `data:image/png;base64,${bytes.toString("base64")}`,
      );
      expect(Math.abs(pixels.strip[0] - preview.strip)).toBeLessThan(15);
      expect(pixels.strip[3]).toBe(255);
      expect(pixels.photo).toEqual([0, 0, 0, 255]);
    }

    await page.getByLabel("添加文字与白条").uncheck();
    await expect(blur).toBeHidden();
    await expect.poll(samplePreview).toEqual({ strip: 0, photo: 0 });
    await page.getByLabel("添加文字与白条").check();
    await expect(blur).toHaveValue("16");
    await expect
      .poll(async () => (await samplePreview()).strip)
      .toBeGreaterThan(70);
    await blur.fill("0");
    await expect.poll(samplePreview).toEqual({ strip: 0, photo: 0 });
    await page.getByRole("radio", { name: "双行模板" }).check();
    await blur.fill("16");
    await expect
      .poll(async () => (await samplePreview()).photo)
      .toBeGreaterThan(70);
    await page.getByRole("radio", { name: "单行模板" }).check();
    await expect.poll(async () => (await samplePreview()).photo).toBe(0);
  });
}

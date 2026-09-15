import { test, expect } from "@playwright/test";
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

for (const path of ["/", "/postcard/"]) {
  test(`font selection and matching PNG/PDF raster at ${path}`, async ({
    page,
  }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.getByTestId("font-status")).toContainText("已应用");
    expect(
      requests.filter((u) =>
        /NotoSansSC|NotoSerifSC|MaShanZheng|Lato|Lora|Caveat/.test(u),
      ),
    ).toHaveLength(0);
    await page
      .getByTestId("file-input")
      .setInputFiles("tests/fixtures/photo.jpg");
    await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeEnabled();
    await page.getByLabel("左侧文字").fill("Hello, world! 山河远阔");
    await page.getByLabel("右侧文字").fill("君の名は。");
    await page.getByLabel("图片缩放").fill("150");
    await page.getByLabel("白条不透明度").fill("75");
    const hashes = new Set<string>();
    let previousPreview = "";
    for (const id of [
      "irohamaru",
      "noto-sans",
      "noto-serif",
      "ma-shan-zheng",
      "lato",
      "lora",
      "caveat",
    ]) {
      await page.getByLabel("明信片字体").selectOption(id);
      await expect(page.getByTestId("font-status")).toContainText("已应用");
      await expect
        .poll(() =>
          page
            .locator("canvas")
            .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
        )
        .not.toBe(previousPreview);
      previousPreview = await page
        .locator("canvas")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL());
      await expect(page.getByLabel("图片缩放")).toHaveValue("150");
      await expect(page.getByLabel("白条不透明度")).toHaveValue("75");
      await expect(page.getByLabel("左侧文字")).toHaveValue(
        "Hello, world! 山河远阔",
      );
      const link = await page
        .getByRole("link", { name: "字体许可" })
        .getAttribute("href");
      const license = await page.request.get(new URL(link!, page.url()).href);
      expect(license.ok()).toBe(true);
      expect(await license.text()).toContain("SIL OPEN FONT LICENSE");
      const files: Record<string, Buffer> = {};
      for (const format of ["PNG", "PDF"]) {
        await page
          .getByRole("button", {
            name: format === "PNG" ? /下载 PNG/ : /下载打印 PDF/,
          })
          .click();
        const promise = page.waitForEvent("download");
        await page.getByRole("button", { name: `仍然下载 ${format}` }).click();
        const download = await promise;
        files[format] = readFileSync((await download.path())!);
      }
      const pngHash = await page.evaluate(
        async (data: string) => {
          const bitmap = await createImageBitmap(
            await (await fetch(data)).blob(),
          );
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const rgb = new Uint8Array(canvas.width * canvas.height * 3);
          for (let i = 0, j = 0; i < rgba.length; i += 4) {
            rgb[j++] = rgba[i];
            rgb[j++] = rgba[i + 1];
            rgb[j++] = rgba[i + 2];
          }
          return Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", rgb)),
          )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        },
        `data:image/png;base64,${files.PNG.toString("base64")}`,
      );
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
      const pdfHash = createHash("sha256")
        .update(decodePDFRawStream(images[0]).decode())
        .digest("hex");
      expect(pdfHash).toBe(pngHash);
      hashes.add(pngHash);
    }
    expect(hashes.size).toBe(7);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("明信片字体").selectOption("caveat");
    await expect(page.getByTestId("font-status")).toContainText(
      "已应用：Caveat",
    );
    await page.screenshot({
      path: `.local/fonts${path === "/" ? "-root" : "-subpath"}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      requests.filter(
        (u) =>
          !u.startsWith("http://127.0.0.1:4173") &&
          !u.startsWith("data:") &&
          !u.startsWith("blob:"),
      ),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("font loading blocks export, late responses cannot change selection, and failures can retry", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/photo.jpg");
  await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeEnabled();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/NotoSansSC-*.otf", async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByLabel("明信片字体").selectOption("noto-sans");
  await expect(page.getByTestId("font-status")).toContainText("正在加载");
  await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeDisabled();
  await page.getByLabel("明信片字体").selectOption("noto-serif");
  await expect(page.getByTestId("font-status")).toContainText(
    "已应用：Noto 宋体",
  );
  const late = page.waitForResponse("**/NotoSansSC-*.otf");
  release();
  await late;
  await expect(page.getByLabel("明信片字体")).toHaveValue("noto-serif");
  await expect(page.getByTestId("font-status")).toContainText(
    "已应用：Noto 宋体",
  );
  await page.route("**/MaShanZheng-*.ttf", (route) => route.abort());
  await page.getByLabel("明信片字体").selectOption("ma-shan-zheng");
  await expect(page.getByTestId("font-status")).toContainText("字体加载失败");
  await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeDisabled();
  await page.unroute("**/MaShanZheng-*.ttf");
  await page.getByRole("button", { name: "重新加载字体" }).click();
  await expect(page.getByTestId("font-status")).toContainText(
    "已应用：马善政楷书",
  );
  await expect(page.getByRole("button", { name: /下载 PNG/ })).toBeEnabled();
});

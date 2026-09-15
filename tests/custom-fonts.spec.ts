import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("custom fonts stay local, survive reload, render in exports, and can be removed", async ({
  page,
  context,
}) => {
  const outside: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      outside.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await expect(
    page.getByRole("button", { name: "上传本地字体" }),
  ).toBeEnabled();
  await page
    .getByTestId("file-input")
    .setInputFiles("tests/fixtures/photo.jpg");
  await page.getByLabel("左侧文字").fill("Hello from here");
  const custom = page.getByTestId("font-file-input");
  const lato = readFileSync("src/assets/fonts/Lato-Regular.ttf");
  await custom.setInputFiles({
    name: "My Lato.ttf",
    mimeType: "font/ttf",
    buffer: lato,
  });
  await expect(page.getByTestId("font-status")).toContainText(
    "已应用：My Lato",
  );
  await expect(page.getByLabel("明信片字体")).toHaveValue(/custom-/);
  const firstId = await page.getByLabel("明信片字体").inputValue();
  await expect(
    page.getByRole("list", { name: "已保存的本地字体" }),
  ).toContainText("My Lato");
  const expected = createHash("sha256").update(lato).digest("hex");
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("postcard-local-fonts");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const items = await new Promise<Array<{ blob: Blob }>>(
      (resolve, reject) => {
        const r = db.transaction("fonts").objectStore("fonts").getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      },
    );
    const hash = await crypto.subtle.digest(
      "SHA-256",
      await items[0].blob.arrayBuffer(),
    );
    return {
      count: items.length,
      sha: Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  });
  expect(stored).toEqual({ count: 1, sha: expected });
  const files: Buffer[] = [];
  for (const format of ["PNG", "PDF"]) {
    await page
      .getByRole("button", {
        name: format === "PNG" ? /下载 PNG/ : /下载打印 PDF/,
      })
      .click();
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name: `仍然下载 ${format}` }).click();
    files.push(readFileSync((await (await promise).path())!));
  }
  expect(files[0].readUInt32BE(16)).toBe(1748);
  const pdf = await PDFDocument.load(files[1]);
  expect(pdf.getPageCount()).toBe(1);
  await page.reload();
  await expect(page.getByTestId("font-status")).toContainText(
    "已应用：My Lato",
  );
  await expect(page.getByLabel("明信片字体")).toHaveValue(firstId);
  await page.goto("/postcard/");
  await expect(page.getByTestId("font-status")).toContainText(
    "已应用：My Lato",
  );
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByTestId("font-status")).toContainText(
    "已应用：My Lato",
  );
  await second.close();
  await custom.setInputFiles({
    name: "Caveat handwriting.ttf",
    mimeType: "font/ttf",
    buffer: readFileSync("src/assets/fonts/Caveat[wght].ttf"),
  });
  await expect(
    page.getByRole("list", { name: "已保存的本地字体" }).locator("li"),
  ).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/custom-fonts-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "删除字体 My Lato" }).click();
  await expect(
    page.getByRole("list", { name: "已保存的本地字体" }),
  ).not.toContainText("My Lato");
  await page
    .getByRole("button", { name: "删除字体 Caveat handwriting" })
    .click();
  await expect(page.getByLabel("明信片字体")).toHaveValue("irohamaru");
  await page.reload();
  await expect(
    page.getByRole("list", { name: "已保存的本地字体" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("明信片字体")).toHaveValue("irohamaru");
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test("rejected fonts preserve the current selection and text", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("font-status")).toContainText("已应用");
  await page.getByLabel("左侧文字").fill("Still here");
  const input = page.getByTestId("font-file-input");
  await input.setInputFiles({
    name: "fake.ttf",
    mimeType: "font/ttf",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByRole("alert")).toContainText("太短或已损坏");
  await expect(page.getByLabel("明信片字体")).toHaveValue("irohamaru");
  await input.setInputFiles({
    name: "broken.ttf",
    mimeType: "font/ttf",
    buffer: Buffer.concat([Buffer.from([0, 1, 0, 0]), Buffer.alloc(512)]),
  });
  await expect(page.getByRole("alert")).toContainText("无法加载");
  await expect(page.getByLabel("左侧文字")).toHaveValue("Still here");
  await input.setInputFiles({
    name: "huge.ttf",
    mimeType: "font/ttf",
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("20 MiB");
  await expect(
    page.getByRole("list", { name: "已保存的本地字体" }),
  ).toHaveCount(0);
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { inspectImage } from "../src/image";
import { geometry, clampCrop, initialCrop } from "../src/render";
import { addPrintDensity } from "../src/export";
const read = (name: string) => {
  const b = readFileSync(`tests/fixtures/${name}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
describe("cover geometry", () => {
  it("uses cropped source pixels for PPI", () => {
    expect(geometry(1920, 1090, initialCrop).ppi).toBeCloseTo(263.676, 2);
    expect(geometry(1920, 1090, { ...initialCrop, zoom: 2 }).ppi).toBeCloseTo(
      131.838,
      2,
    );
  });
  it("rotates dimensions and clamps both axes without paper gaps", () => {
    const c = clampCrop(1920, 1090, {
      zoom: 1,
      rotation: 90,
      x: 9999,
      y: -9999,
    });
    expect(c.x).toBe(0);
    expect(c.y).toBeLessThan(0);
    expect(geometry(1920, 1090, c).ppi).toBeCloseTo(187.067, 2);
  });
});
describe("format inspection", () => {
  it.each(["photo.jpg", "static.webp", "transparent.png"])(
    "reads %s",
    (name) => {
      expect(inspectImage(read(name)).width).toBeGreaterThan(1000);
    },
  );
  it.each(["animated.png", "animated.webp"])("rejects animation %s", (name) =>
    expect(() => inspectImage(read(name))).toThrow(/动画|动态/),
  );
  it.each([1, 2, 3, 4, 5, 6, 7, 8])("reads EXIF orientation %i", (n) =>
    expect(inspectImage(read(`exif-${n}.jpg`)).orientation).toBe(n),
  );
  it("rejects misleading names and truncation", () => {
    expect(() =>
      inspectImage(new TextEncoder().encode("<svg/>").buffer),
    ).toThrow();
    expect(() => inspectImage(read("photo.jpg").slice(0, 100))).toThrow();
  });
  it("preflights pixel limits", () => {
    const b = read("transparent.png");
    new DataView(b).setUint32(16, 40001);
    expect(() => inspectImage(b)).toThrow(/40 MP/);
  });
  it("adds PNG print resolution metadata", () => {
    const b = addPrintDensity(new Uint8Array(read("transparent.png")));
    expect(String.fromCharCode(...b.slice(37, 41))).toBe("pHYs");
    expect(new DataView(b.buffer).getUint32(41)).toBe(11811);
  });
});

describe("portrait cover geometry", () => {
  it("uses portrait paper dimensions for crop and effective PPI", () => {
    expect(geometry(1920, 1090, initialCrop, "portrait").ppi).toBeCloseTo(
      187.067,
      2,
    );
    const c = clampCrop(
      1920,
      1090,
      { ...initialCrop, x: 9999, y: 9999 },
      "portrait",
    );
    expect(c.y).toBe(0);
    expect(c.x).toBeCloseTo(((1920 * 1480) / 1090 - 1050) / 2, 5);
    expect(
      geometry(1920, 1090, { ...initialCrop, rotation: 90 }, "portrait").ppi,
    ).toBeCloseTo(263.676, 2);
  });
});

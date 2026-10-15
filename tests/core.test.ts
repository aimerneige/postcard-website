import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { inspectImage } from "../src/image";
import {
  geometry,
  clampCrop,
  initialCrop,
  initialBackDesign,
  getTextLayout,
} from "../src/render";
import { addPrintDensity } from "../src/export";
const read = (name: string) => {
  const b = readFileSync(`tests/fixtures/${name}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
describe("text templates", () => {
  it("preserves the default single-line strip and baseline", () => {
    const layout = getTextLayout({ left: "Hello", right: "World", fontId: "irohamaru" });
    expect(layout.height).toBe(64);
    expect(layout.rows).toHaveLength(1);
    expect(layout.rows[0].baseline).toBe(43);
  });
  it("sizes each row for its largest font and keeps individual styles", () => {
    const layout = getTextLayout({
      left: "Title", right: "Date", leftSecond: "Subtitle", rightSecond: "Signature",
      fontId: "irohamaru", textTemplate: "double",
      textStyles: {
        left: { fontId: "lora", fontSize: 64 },
        right: { fontId: "lato", fontSize: 24 },
        leftSecond: { fontId: "caveat", fontSize: 24 },
        rightSecond: { fontId: null, fontSize: 12 },
      },
    });
    expect(layout.height).toBe(176);
    expect(layout.rows.map((row) => row.height)).toEqual([112, 64]);
    expect(layout.rows[0].texts[0]).toEqual({ text: "Title", fontId: "lora", fontSize: 64 });
    expect(layout.rows[1].texts[1]).toEqual({ text: "Signature", fontId: "irohamaru", fontSize: 12 });
  });
  it("hides the second row in the single-line template", () => {
    const layout = getTextLayout({ left: "Title", right: "", leftSecond: "Hidden", fontId: "lato" });
    expect(layout.rows).toHaveLength(1);
    expect(layout.rows[0].texts[0].text).toBe("Title");
  });
});
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
  it.each(["photo.jpg", "static.webp", "transparent.png", "photo.jxl"])(
    "reads %s",
    (name) => {
      expect(inspectImage(read(name)).width).toBeGreaterThan(1000);
    },
  );
  it.each(["animated.png", "animated.webp", "animated.jxl"])(
    "rejects animation %s",
    (name) => expect(() => inspectImage(read(name))).toThrow(/动画|动态/),
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
  it.each([
    [8000, 6000],
    [12000, 9000],
  ])("accepts %i × %i within the 108 MP limit", (width, height) => {
    const b = read("transparent.png");
    const v = new DataView(b);
    v.setUint32(16, width);
    v.setUint32(20, height);
    expect(inspectImage(b)).toMatchObject({ width, height });
  });
  it.each([
    [12001, 9000],
    [108_000_001, 1],
  ])("rejects %i × %i above the 108 MP limit", (width, height) => {
    const b = read("transparent.png");
    const v = new DataView(b);
    v.setUint32(16, width);
    v.setUint32(20, height);
    expect(() => inspectImage(b)).toThrow(/108 MP/);
  });
  it("adds PNG print resolution metadata", () => {
    const b = addPrintDensity(new Uint8Array(read("transparent.png")));
    expect(String.fromCharCode(...b.slice(37, 41))).toBe("pHYs");
    expect(new DataView(b.buffer).getUint32(41)).toBe(11811);
  });
  it("adds PNG print resolution metadata with custom PPI", () => {
    const b = addPrintDensity(new Uint8Array(read("transparent.png")), 150);
    expect(String.fromCharCode(...b.slice(37, 41))).toBe("pHYs");
    expect(new DataView(b.buffer).getUint32(41)).toBe(5906);
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

describe("postcard back design", () => {
  it("provides comprehensive default back design parameters", () => {
    expect(initialBackDesign.topText).toBe("POST CARD");
    expect(initialBackDesign.stampEnabled).toBe(true);
    expect(initialBackDesign.stampText).toBe("STAMP");
    expect(initialBackDesign.dividerEnabled).toBe(true);
    expect(initialBackDesign.addressEnabled).toBe(true);
    expect(initialBackDesign.addressLinesCount).toBe(4);
    expect(initialBackDesign.postalCodeEnabled).toBe(false);
    expect(initialBackDesign.imageEnabled).toBe(false);
    expect(initialBackDesign.leftBottomText).toBe("片刻 · 留住此刻风景");
    expect(initialBackDesign.rightBottomText).toBe("DESIGNED WITH MOMENT");
  });

  it("supports customizable address line spacing, styles, prefix, paper color and international layout", () => {
    expect(initialBackDesign.addressLineSpacing).toBe(85);
    expect(initialBackDesign.addressLineStyle).toBe("solid");
    expect(initialBackDesign.addressPrefix).toBe("To.");
    expect(initialBackDesign.paperColor).toBe("ivory");
    expect(initialBackDesign.topSubText).toBe("CARTE POSTALE");
  });
});



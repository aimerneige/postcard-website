import { fontStack, type FontId } from "./fonts";
import type { Source } from "./image";
import { getLayout, type Layout } from "./layout";
export type Crop = { zoom: number; rotation: number; x: number; y: number };
export const initialCrop: Crop = { zoom: 1, rotation: 0, x: 0, y: 0 };
export function geometry(
  width: number,
  height: number,
  crop: Crop,
  layout: Layout = "landscape",
) {
  const { width: W, height: H } = getLayout(layout);
  const odd = crop.rotation % 180 !== 0,
    w = odd ? height : width,
    h = odd ? width : height;
  const scale = Math.max(W / w, H / h) * crop.zoom;
  return {
    scale,
    maxX: Math.max(0, (w * scale - W) / 2),
    maxY: Math.max(0, (h * scale - H) / 2),
    ppi: (25.4 * 10) / scale,
  };
}
export function clampCrop(
  width: number,
  height: number,
  crop: Crop,
  layout: Layout = "landscape",
): Crop {
  const { maxX, maxY } = geometry(width, height, crop, layout);
  return {
    ...crop,
    x: Math.max(-maxX, Math.min(maxX, crop.x)),
    y: Math.max(-maxY, Math.min(maxY, crop.y)),
  };
}
export type Design = {
  crop: Crop;
  left: string;
  right: string;
  opacity: number;
  fontId: FontId;
  layout: Layout;
};
export function render(
  canvas: HTMLCanvasElement,
  source: Source,
  design: Design,
) {
  const { width: W, height: H, textWidth } = getLayout(design.layout);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("浏览器无法创建画布。");
  const c = clampCrop(
    source.bitmap.width,
    source.bitmap.height,
    design.crop,
    design.layout,
  );
  const { scale } = geometry(
    source.bitmap.width,
    source.bitmap.height,
    c,
    design.layout,
  );
  ctx.save();
  ctx.scale(canvas.width / W, canvas.height / H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + c.x, H / 2 + c.y);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source.bitmap,
    -source.bitmap.width / 2,
    -source.bitmap.height / 2,
  );
  ctx.restore();
  ctx.fillStyle = `rgba(255,255,255,${design.opacity})`;
  ctx.fillRect(0, H - 64, W, 64);
  ctx.font = `400 32px ${fontStack(design.fontId)}`;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  // Fixed alphabetic baseline: 11 logical pixels beneath the strip centre.
  for (const [text, x, align] of [
    [design.left, 16, "left"],
    [design.right, W - 16, "right"],
  ] as const) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(align === "left" ? 16 : W - 16 - textWidth, H - 64, textWidth, 64);
    ctx.clip();
    ctx.textAlign = align;
    ctx.fillText(text, x, H - 32 + 11);
    ctx.restore();
  }
  ctx.restore();
}
export function textOverflows(text: string, fontId: FontId, layout: Layout) {
  const c = document.createElement("canvas").getContext("2d")!;
  c.font = `400 32px ${fontStack(fontId)}`;
  return c.measureText(text).width > getLayout(layout).textWidth;
}

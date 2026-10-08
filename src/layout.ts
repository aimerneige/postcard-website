export type Layout = "landscape" | "portrait";
export const STRIP_HEIGHT = 64;
export const TEXT_MARGIN = 16;
export function getLayout(layout: Layout, ppi = 300) {
  const portrait = layout === "portrait";
  const width = portrait ? 1050 : 1480;
  const height = portrait ? 1480 : 1050;
  const widthMm = width / 10;
  const heightMm = height / 10;
  return {
    width,
    height,
    widthMm,
    heightMm,
    exportWidth: Math.round((widthMm / 25.4) * ppi),
    exportHeight: Math.round((heightMm / 25.4) * ppi),
    // Keep at least 16 logical pixels between the two text boxes.
    textWidth: Math.min(640, (width - 3 * TEXT_MARGIN) / 2),
  };
}

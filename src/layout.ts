export type Layout = "landscape" | "portrait";
export const STRIP_HEIGHT = 64;
export const TEXT_MARGIN = 16;
export function getLayout(layout: Layout) {
  const portrait = layout === "portrait";
  const width = portrait ? 1050 : 1480;
  const height = portrait ? 1480 : 1050;
  return {
    width,
    height,
    widthMm: width / 10,
    heightMm: height / 10,
    exportWidth: portrait ? 1240 : 1748,
    exportHeight: portrait ? 1748 : 1240,
    // Keep at least 16 logical pixels between the two text boxes.
    textWidth: Math.min(640, (width - 3 * TEXT_MARGIN) / 2),
  };
}

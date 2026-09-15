import { getLayout } from "./layout";
import { render, type Design } from "./render";
import type { Source } from "./image";
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function addPrintDensity(bytes: Uint8Array) {
  const chunk = new Uint8Array(21),
    v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  v.setUint32(8, 11811);
  v.setUint32(12, 11811);
  chunk[16] = 1;
  v.setUint32(17, crc32(chunk.slice(4, 17)));
  const result = new Uint8Array(bytes.length + 21);
  result.set(bytes.slice(0, 33));
  result.set(chunk, 33);
  result.set(bytes.slice(33), 54);
  return result;
}
export async function makeExport(
  source: Source,
  design: Design,
  format: "png" | "pdf",
) {
  const canvas = document.createElement("canvas");
  const dimensions = getLayout(design.layout);
  canvas.width = dimensions.exportWidth;
  canvas.height = dimensions.exportHeight;
  render(canvas, source, design);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("导出失败，请重试。"))),
      "image/png",
    ),
  );
  const png = addPrintDensity(new Uint8Array(await blob.arrayBuffer()));
  canvas.width = canvas.height = 1;
  if (format === "png") return new Blob([png], { type: "image/png" });
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const width = (dimensions.widthMm / 25.4) * 72,
    height = (dimensions.heightMm / 25.4) * 72;
  const page = pdf.addPage([width, height]);
  page.drawImage(await pdf.embedPng(png), { x: 0, y: 0, width, height });
  pdf.setTitle("片刻 · 明信片");
  return new Blob([new Uint8Array(await pdf.save())], {
    type: "application/pdf",
  });
}
export function download(blob: Blob, format: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `postcard.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

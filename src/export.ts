import { getLayout } from "./layout";
import { render, renderBack, type Design, type BackDesign } from "./render";
import type { Source } from "./image";

export type ExportScope = "current" | "front" | "back" | "both";

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function addPrintDensity(bytes: Uint8Array, ppi = 300) {
  const chunk = new Uint8Array(21),
    v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  const ppm = Math.round(ppi / 0.0254);
  v.setUint32(8, ppm);
  v.setUint32(12, ppm);
  chunk[16] = 1;
  v.setUint32(17, crc32(chunk.slice(4, 17)));
  const result = new Uint8Array(bytes.length + 21);
  result.set(bytes.slice(0, 33));
  result.set(chunk, 33);
  result.set(bytes.slice(33), 54);
  return result;
}

async function renderCanvasToPng(
  renderFn: (c: HTMLCanvasElement) => void,
  layout: Design["layout"],
  ppi: number,
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  const dimensions = getLayout(layout, ppi);
  canvas.width = dimensions.exportWidth;
  canvas.height = dimensions.exportHeight;
  renderFn(canvas);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("导出失败，请重试。"))),
      "image/png",
    ),
  );
  const png = addPrintDensity(new Uint8Array(await blob.arrayBuffer()), ppi);
  canvas.width = canvas.height = 1;
  return png;
}

export async function makeExport(
  source: Source | null,
  design: Design,
  format: "png" | "pdf",
  ppi = 300,
  backDesign?: BackDesign,
  scope: ExportScope = "front",
): Promise<Blob | { front: Blob; back: Blob }> {
  const dimensions = getLayout(design.layout, ppi);
  const targetScope = scope === "current" ? "front" : scope;

  if (targetScope === "both") {
    if (!source) throw Error("导出双面需要先选择正面图片。");
    if (!backDesign) throw Error("未提供背面设计。");

    const frontPng = await renderCanvasToPng(
      (c) => render(c, source, design),
      design.layout,
      ppi,
    );
    const backPng = await renderCanvasToPng(
      (c) => renderBack(c, backDesign),
      backDesign.layout,
      ppi,
    );

    if (format === "png") {
      return {
        front: new Blob([frontPng as BlobPart], { type: "image/png" }),
        back: new Blob([backPng as BlobPart], { type: "image/png" }),
      };
    }

    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const width = (dimensions.widthMm / 25.4) * 72;
    const height = (dimensions.heightMm / 25.4) * 72;

    const page1 = pdf.addPage([width, height]);
    page1.drawImage(await pdf.embedPng(frontPng), {
      x: 0,
      y: 0,
      width,
      height,
    });

    const page2 = pdf.addPage([width, height]);
    page2.drawImage(await pdf.embedPng(backPng), {
      x: 0,
      y: 0,
      width,
      height,
    });

    pdf.setTitle("片刻 · 明信片");
    return new Blob([new Uint8Array(await pdf.save())], {
      type: "application/pdf",
    });
  }

  if (targetScope === "back") {
    if (!backDesign) throw Error("未提供背面设计。");
    const backPng = await renderCanvasToPng(
      (c) => renderBack(c, backDesign),
      backDesign.layout,
      ppi,
    );
    if (format === "png")
      return new Blob([backPng as BlobPart], { type: "image/png" });

    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const width = (dimensions.widthMm / 25.4) * 72;
    const height = (dimensions.heightMm / 25.4) * 72;
    const page = pdf.addPage([width, height]);
    page.drawImage(await pdf.embedPng(backPng), {
      x: 0,
      y: 0,
      width,
      height,
    });
    pdf.setTitle("片刻 · 明信片（背面）");
    return new Blob([new Uint8Array(await pdf.save())], {
      type: "application/pdf",
    });
  }

  // targetScope === "front"
  if (!source) throw Error("请先选择图片。");
  const frontPng = await renderCanvasToPng(
    (c) => render(c, source, design),
    design.layout,
    ppi,
  );
  if (format === "png")
    return new Blob([frontPng as BlobPart], { type: "image/png" });

  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const width = (dimensions.widthMm / 25.4) * 72;
  const height = (dimensions.heightMm / 25.4) * 72;
  const page = pdf.addPage([width, height]);
  page.drawImage(await pdf.embedPng(frontPng), { x: 0, y: 0, width, height });
  pdf.setTitle("片刻 · 明信片");
  return new Blob([new Uint8Array(await pdf.save())], {
    type: "application/pdf",
  });
}

export function download(blob: Blob, formatOrFilename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = formatOrFilename.includes(".")
    ? formatOrFilename
    : `postcard.${formatOrFilename}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}


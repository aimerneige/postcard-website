import { fontStack, type FontId } from "./fonts";
import type { Source } from "./image";
import { getLayout, TEXT_MARGIN, type Layout } from "./layout";
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
  stripEnabled: boolean;
  opacity: number;
  fontId: FontId;
  layout: Layout;
};

export type PaperColor = "ivory" | "white" | "vintage";
export type LineStyle = "solid" | "dashed" | "dotted";

export type BackDesign = {
  leftBottomText: string;
  rightBottomText: string;
  stampEnabled: boolean;
  stampText: string;
  topText: string;
  topSubText?: string;
  dividerEnabled: boolean;
  dividerStyle?: LineStyle;
  addressEnabled: boolean;
  addressLinesCount: number;
  addressLineSpacing?: number;
  addressLineStyle?: LineStyle;
  addressPrefix?: string;
  postalCodeEnabled: boolean;
  imageEnabled: boolean;
  imageSource: Source | null;
  paperColor?: PaperColor;
  fontId: FontId;
  layout: Layout;
};

export const initialBackDesign: Omit<
  BackDesign,
  "fontId" | "layout" | "imageSource"
> = {
  leftBottomText: "片刻 · 留住此刻风景",
  rightBottomText: "DESIGNED WITH MOMENT",
  stampEnabled: true,
  stampText: "STAMP",
  topText: "POST CARD",
  topSubText: "CARTE POSTALE",
  dividerEnabled: true,
  dividerStyle: "solid",
  addressEnabled: true,
  addressLinesCount: 4,
  addressLineSpacing: 85,
  addressLineStyle: "solid",
  addressPrefix: "To.",
  postalCodeEnabled: false,
  imageEnabled: false,
  paperColor: "ivory",
};

export function render(
  canvas: HTMLCanvasElement,
  source: Source,
  design: Design,
) {
  const { width: W, height: H } = getLayout(design.layout);
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
  if (design.stripEnabled) {
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
      if (!text) continue;
      ctx.textAlign = align;
      ctx.fillText(text, x, H - 32 + 11);
    }
  }
  ctx.restore();
}
export function textsOverlap(
  left: string,
  right: string,
  fontId: FontId,
  layout: Layout,
) {
  if (!left.trim() || !right.trim()) return false;
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return false;
  c.font = `400 32px ${fontStack(fontId)}`;
  const { width: W } = getLayout(layout);
  return (
    c.measureText(left).width + c.measureText(right).width >
    W - 2 * TEXT_MARGIN
  );
}
export function textOverflows(text: string, fontId: FontId, layout: Layout) {
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return false;
  c.font = `400 32px ${fontStack(fontId)}`;
  return c.measureText(text).width > getLayout(layout).textWidth;
}

export function renderBack(
  canvas: HTMLCanvasElement,
  design: BackDesign,
) {
  const { width: W, height: H } = getLayout(design.layout);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("浏览器无法创建画布。");

  ctx.save();
  ctx.scale(canvas.width / W, canvas.height / H);

  const isPortrait = design.layout === "portrait";

  // 1. 纸张底色与微温质感
  const paperColor = design.paperColor || "ivory";
  let bgFill = "#fcfbf7";
  let inkPrimary = "#2c342d";
  let inkSecondary = "#6e7b6c";
  let lineStroke = "#cbd4c7";
  let dividerStroke = "#d4ded0";

  if (paperColor === "vintage") {
    bgFill = "#f5eee2";
    inkPrimary = "#382f25";
    inkSecondary = "#7a6e5e";
    lineStroke = "#c9beac";
    dividerStroke = "#d6c9b7";
  } else if (paperColor === "white") {
    bgFill = "#ffffff";
    inkPrimary = "#222a24";
    inkSecondary = "#667264";
    lineStroke = "#cfd6cb";
    dividerStroke = "#d8dfd5";
  }

  ctx.fillStyle = bgFill;
  ctx.fillRect(0, 0, W, H);

  // 纸张精致外边框（极细）
  ctx.strokeStyle = lineStroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // 2. 左上角：国标标准收件人邮政编码框格（GB/T 1416 / YZ/T 0190 规范）
  // 国标要求：距上边 9~12mm (取10mm=100px)，距左边 12~15mm (取13mm=130px)
  // 单格宽 7.0mm=70px，高 10.0mm=100px（竖长方形），间距 1.8mm=18px，线宽 <0.5mm (1.5px)
  // 色标为金红色 PANTONE 1795C (#d92b27)
  if (design.postalCodeEnabled) {
    const boxW = isPortrait ? 60 : 70;
    const boxH = isPortrait ? 88 : 100;
    const boxGap = isPortrait ? 15 : 18;
    const boxStartX = isPortrait ? 110 : 130;
    const boxStartY = isPortrait ? 100 : 100;

    ctx.save();
    ctx.strokeStyle = "#d92b27"; // 国标金红色 PANTONE 1795C
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.strokeRect(
        boxStartX + i * (boxW + boxGap),
        boxStartY,
        boxW,
        boxH,
      );
    }
    ctx.restore();
  }

  // 3. 正上方文字：POST CARD 与副标（仅在未启用邮政编码框时绘制；中国邮政明信片正上方为国标邮政编码，不绘制顶部中央文字以消除冲突）
  const topMain = design.topText.trim();
  const topSub = design.topSubText?.trim();
  if (!design.postalCodeEnabled && (topMain || topSub)) {
    const topY = isPortrait ? 90 : 85;
    ctx.save();
    ctx.fillStyle = inkPrimary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let maxTextWidth = 160;

    if (topMain) {
      ctx.font = `400 30px ${fontStack(design.fontId)}`;
      ctx.fillText(topMain, W / 2, topY);
      maxTextWidth = Math.max(maxTextWidth, ctx.measureText(topMain).width);
    }

    if (topSub) {
      ctx.font = `400 13px ${fontStack(design.fontId)}`;
      ctx.fillStyle = inkSecondary;
      ctx.fillText(topSub, W / 2, topMain ? topY + 24 : topY);
      maxTextWidth = Math.max(maxTextWidth, ctx.measureText(topSub).width);
    }

    // 两侧点缀纤细复古饰线与端点小圆点
    const titleWidth = maxTextWidth;
    const lineSpan = 50;
    const lineY = topY + (topMain && topSub ? 36 : 22);

    ctx.beginPath();
    ctx.strokeStyle = dividerStroke;
    ctx.lineWidth = 1;
    ctx.moveTo(W / 2 - titleWidth / 2 - 20 - lineSpan, lineY);
    ctx.lineTo(W / 2 - titleWidth / 2 - 20, lineY);
    ctx.moveTo(W / 2 + titleWidth / 2 + 20, lineY);
    ctx.lineTo(W / 2 + titleWidth / 2 + 20 + lineSpan, lineY);
    ctx.stroke();

    ctx.fillStyle = inkSecondary;
    ctx.beginPath();
    ctx.arc(W / 2 - titleWidth / 2 - 20, lineY, 2, 0, Math.PI * 2);
    ctx.arc(W / 2 + titleWidth / 2 + 20, lineY, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. 右上角：邮票标志（按100日元普通切手サクラソウ/报春花尺寸 21.5mm×25.5mm 缩小10%：19.4mm×23.0mm，即 194px×230px）
  if (design.stampEnabled) {
    const stampW = isPortrait ? 194 : 194;
    const stampH = isPortrait ? 230 : 230;
    const stampX = W - (isPortrait ? 90 : 100) - stampW;
    const stampY = isPortrait ? 90 : 100;

    ctx.save();

    // 外框：齿孔效果虚线（194px × 230px）
    ctx.strokeStyle = inkSecondary;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(stampX, stampY, stampW, stampH);
    ctx.setLineDash([]);

    // 内框：精细实线印面（166px × 202px，边距 14px）
    ctx.strokeStyle = dividerStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(stampX + 14, stampY + 14, stampW - 28, stampH - 28);

    // 邮戳徽章：复古同心圆与消印波纹
    const sealCenterX = stampX + stampW / 2;
    const sealCenterY = stampY + stampH / 2 - 16;

    // 航空消印波纹（向左微展出三道波浪）
    ctx.strokeStyle = inkSecondary;
    ctx.lineWidth = 1;
    for (let wave = -1; wave <= 1; wave++) {
      const wy = sealCenterY + wave * 9;
      ctx.beginPath();
      ctx.moveTo(sealCenterX - 36, wy);
      ctx.bezierCurveTo(
        sealCenterX - 52,
        wy - 4,
        sealCenterX - 68,
        wy + 4,
        sealCenterX - 84,
        wy,
      );
      ctx.stroke();
    }

    // 同心圆印戳（按比例缩放，精致和谐）
    ctx.beginPath();
    ctx.arc(sealCenterX, sealCenterY, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sealCenterX, sealCenterY, 19, 0, Math.PI * 2);
    ctx.stroke();

    // 邮票中心文字（400 兼容中文字体）
    ctx.font = `400 13px ${fontStack(design.fontId)}`;
    ctx.fillStyle = inkSecondary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(design.stampText || "STAMP", sealCenterX, stampY + stampH / 2 + 38);

    // 辅助微文字
    ctx.font = `400 9px ${fontStack(design.fontId)}`;
    ctx.fillStyle = inkSecondary;
    ctx.fillText("贴邮票处 · POSTAGE", sealCenterX, stampY + 23);

    ctx.restore();
  }

  // 5. 中间垂直分隔线
  if (design.dividerEnabled) {
    const divX = W / 2;
    const divY1 = isPortrait ? 200 : 210;
    const divY2 = isPortrait ? H - 95 : H - 85;

    ctx.save();
    ctx.strokeStyle = dividerStroke;
    ctx.lineWidth = 1.2;
    if (design.dividerStyle === "dashed") {
      ctx.setLineDash([8, 6]);
    } else if (design.dividerStyle === "dotted") {
      ctx.setLineDash([2, 5]);
    }
    ctx.beginPath();
    ctx.moveTo(divX, divY1);
    ctx.lineTo(divX, divY2);
    ctx.stroke();

    // 中间装饰小微标
    ctx.setLineDash([]);
    ctx.fillStyle = dividerStroke;
    const midY = (divY1 + divY2) / 2;
    ctx.beginPath();
    ctx.arc(divX, midY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 6. 右侧地址区（横线行距与样式全面自定义）
  if (design.addressEnabled) {
    const count = typeof design.addressLinesCount === "number" ? design.addressLinesCount : 4;

    const lineStartX = W / 2 + (isPortrait ? 40 : 60);
    const lineEndX = W - (isPortrait ? 60 : 80);

    // 舒适书写行距（国标与常规手写推荐 80~100px）
    const spacing = Math.max(45, Math.min(130, design.addressLineSpacing || (isPortrait ? 85 : 85)));

    // 垂直排布算法：以中下部为锚点向上排列，使构图平衡稳定
    const baseBottomY = isPortrait ? H - 160 : H - 145;
    const firstLineY = count > 0 ? baseBottomY - (count - 1) * spacing : baseBottomY;

    ctx.save();
    ctx.strokeStyle = lineStroke;
    ctx.lineWidth = 1.3;

    if (design.addressLineStyle === "dashed") {
      ctx.setLineDash([8, 6]);
    } else if (design.addressLineStyle === "dotted") {
      ctx.setLineDash([2, 5]);
    }

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const ly = firstLineY + i * spacing;
        ctx.beginPath();
        ctx.moveTo(lineStartX, ly);
        ctx.lineTo(lineEndX, ly);
        ctx.stroke();
      }
    }

    // 收件人标识（400 规范字重，确保“收件人：”等中文字体 100% 完美应用）
    ctx.setLineDash([]);
    const prefix = design.addressPrefix !== undefined ? design.addressPrefix : "To.";
    if (prefix.trim() && count > 0) {
      ctx.font = `400 22px ${fontStack(design.fontId)}`;
      ctx.fillStyle = inkSecondary;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(prefix, lineStartX, firstLineY - 16);
    }

    ctx.restore();
  }

  // 7. 左侧区域（图片或优雅书写空白）
  const leftX = isPortrait ? 45 : 65;
  const leftY = isPortrait ? 150 : 135;
  const leftW = isPortrait ? W / 2 - 80 : W / 2 - 130;
  const leftH = isPortrait ? H - 250 : H - 230;

  if (design.imageEnabled) {
    if (design.imageSource) {
      const bmp = design.imageSource.bitmap;
      const scale = Math.max(leftW / bmp.width, leftH / bmp.height);
      const sw = leftW / scale;
      const sh = leftH / scale;
      const sx = (bmp.width - sw) / 2;
      const sy = (bmp.height - sh) / 2;

      ctx.save();
      // 照片相框艺术衬底
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(leftX - 8, leftY - 8, leftW + 16, leftH + 16);
      ctx.strokeStyle = dividerStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(leftX - 8, leftY - 8, leftW + 16, leftH + 16);

      ctx.beginPath();
      ctx.rect(leftX, leftY, leftW, leftH);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, sx, sy, sw, sh, leftX, leftY, leftW, leftH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = dividerStroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(leftX, leftY, leftW, leftH);
      ctx.setLineDash([]);
      ctx.font = `400 18px ${fontStack(design.fontId)}`;
      ctx.fillStyle = inkSecondary;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📷 选择左侧图片展示区", leftX + leftW / 2, leftY + leftH / 2);
      ctx.restore();
    }
  }

  // 8. 边缘小文字（左下角、右下角出版/寄语信息）
  const bottomY = isPortrait ? H - 42 : H - 40;
  const bottomMargin = isPortrait ? 45 : 60;

  if (design.leftBottomText.trim()) {
    ctx.save();
    ctx.font = `400 16px ${fontStack(design.fontId)}`;
    ctx.fillStyle = inkSecondary;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(design.leftBottomText, bottomMargin, bottomY);
    ctx.restore();
  }

  if (design.rightBottomText.trim()) {
    ctx.save();
    ctx.font = `400 16px ${fontStack(design.fontId)}`;
    ctx.fillStyle = inkSecondary;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(design.rightBottomText, W - bottomMargin, bottomY);
    ctx.restore();
  }

  ctx.restore();
}


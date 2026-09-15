import {
  createCustomFont,
  readFontFormat,
  storeCustomFont,
  removeCustomFont,
  MAX_CUSTOM_FONT_BYTES,
  MAX_CUSTOM_FONTS,
  type CustomFont,
  type CustomFontId,
} from "./custom-fonts";
import defaultUrl from "./assets/fonts/irohamaru-Regular.ttf?url";
import sansUrl from "./assets/fonts/NotoSansSC-Regular.otf?url";
import serifUrl from "./assets/fonts/NotoSerifSC-Regular.otf?url";
import brushUrl from "./assets/fonts/MaShanZheng-Regular.ttf?url";

import latoUrl from "./assets/fonts/Lato-Regular.ttf?url";
import loraUrl from "./assets/fonts/Lora[wght].ttf?url";
import caveatUrl from "./assets/fonts/Caveat[wght].ttf?url";

export const fonts = [
  {
    id: "irohamaru",
    family: "PostcardIrohamaru",
    label: "irohamaru（日语圆体）",
    url: defaultUrl,
    description: "日语字形优化 · 柔和圆润，适合日文短句",
    license: "irohamaru-OFL.txt",
  },
  {
    id: "noto-sans",
    family: "PostcardNotoSans",
    label: "Noto 黑体（简体中文）",
    url: sansUrl,
    description: "简洁清晰 · 适合日常文字",
    license: "noto-sans-sc-OFL.txt",
  },
  {
    id: "noto-serif",
    family: "PostcardNotoSerif",
    label: "Noto 宋体（简体中文）",
    url: serifUrl,
    description: "端正规整 · 适合书信与诗句",
    license: "noto-serif-sc-OFL.txt",
  },
  {
    id: "ma-shan-zheng",
    family: "PostcardMaShanZheng",
    label: "马善政楷书",
    url: brushUrl,
    description: "毛笔手写 · 适合中文题字",
    license: "ma-shan-zheng-OFL.txt",
  },
  {
    id: "lato",
    family: "PostcardLato",
    label: "Lato（英文无衬线）",
    url: latoUrl,
    description: "简洁现代 · 适合英文短句；中日文使用内置圆体",
    license: "lato-OFL.txt",
  },
  {
    id: "lora",
    family: "PostcardLora",
    label: "Lora（英文衬线）",
    url: loraUrl,
    description: "典雅书卷 · 适合英文诗句；中日文使用内置圆体",
    license: "lora-OFL.txt",
  },
  {
    id: "caveat",
    family: "PostcardCaveat",
    label: "Caveat（英文手写）",
    url: caveatUrl,
    description: "自然随性 · 适合英文寄语；中日文使用内置圆体",
    license: "caveat-OFL.txt",
  },
] as const;
export type FontId = (typeof fonts)[number]["id"] | CustomFontId;
const customRegistry = new Map<CustomFontId, CustomFont>();
const loadedFaces = new Map<FontId, FontFace>();
export function registerCustomFonts(items: CustomFont[]) {
  for (const item of items) customRegistry.set(item.id, item);
}
export function customFont(id: FontId) {
  return customRegistry.get(id as CustomFontId);
}
export function isCustomFont(id: FontId): id is CustomFontId {
  return id.startsWith("custom-");
}
export function unregisterCustomFont(id: CustomFontId) {
  customRegistry.delete(id);
  pending.delete(id);
  const face = loadedFaces.get(id);
  if (face) document.fonts.delete(face);
  loadedFaces.delete(id);
}
export async function uploadCustomFont(
  file: File,
  currentCount: number,
): Promise<CustomFont> {
  if (currentCount >= MAX_CUSTOM_FONTS)
    throw Error(`最多保存 ${MAX_CUSTOM_FONTS} 款自定义字体，请先删除旧字体。`);
  if (file.size > MAX_CUSTOM_FONT_BYTES)
    throw Error("字体超过 20 MiB，请选择较小的文件。");
  let data: ArrayBuffer;
  try {
    data = await file.arrayBuffer();
  } catch {
    throw Error("无法读取字体文件。");
  }
  readFontFormat(new Uint8Array(data));
  const font = createCustomFont(file);
  let face: FontFace;
  try {
    face = new FontFace(font.family, data, { weight: "400", style: "normal" });
    await face.load();
  } catch {
    throw Error("字体无法加载，文件可能损坏或浏览器不支持该字体。");
  }
  try {
    await storeCustomFont(font);
  } catch {
    throw Error("无法保存字体。请检查浏览器可用空间和站点存储权限。");
  }
  customRegistry.set(font.id, font);
  document.fonts.add(face);
  loadedFaces.set(font.id, face);
  pending.set(font.id, Promise.resolve());
  return font;
}
export async function deleteCustomFont(id: CustomFontId) {
  await removeCustomFont(id);
  unregisterCustomFont(id);
}

export const DEFAULT_FONT: FontId = "irohamaru";
export function getFont(id: FontId) {
  const found =
    customRegistry.get(id as CustomFontId) ??
    fonts.find((font) => font.id === id);
  if (!found) throw Error("所选字体已从本地缓存中移除。");
  return found;
}
export function fontStack(id: FontId) {
  const family = getFont(id).family;
  return id === DEFAULT_FONT
    ? `"${family}", sans-serif`
    : `"${family}", "${getFont(DEFAULT_FONT).family}", sans-serif`;
}
const pending = new Map<FontId, Promise<void>>();
function loadFace(id: FontId): Promise<void> {
  const existing = pending.get(id);
  if (existing) return existing;
  const font = getFont(id);
  const task = (async () => {
    const source = isCustomFont(id)
      ? await customRegistry.get(id)!.blob.arrayBuffer()
      : `url("${font.url}")`;
    const face = new FontFace(font.family, source, {
      weight: "400",
      style: "normal",
    });
    await face.load();
    if (isCustomFont(id) && !customRegistry.has(id))
      throw Error("本地字体已被删除。");
    document.fonts.add(face);
    loadedFaces.set(id, face);
  })().catch((error) => {
    pending.delete(id);
    throw error;
  });
  pending.set(id, task);
  return task;
}
export async function loadFont(id: FontId) {
  // The default Japanese font supplies CJK glyphs missing from the selected font.
  // Cache successful loads, but permit retrying a failed network request.
  await Promise.all([...new Set([DEFAULT_FONT, id])].map(loadFace));
}

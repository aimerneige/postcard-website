import originalUrl from "./assets/irohamaru-Regular.ttf?url";
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
    label: "irohamaru 圆体（原版）",
    url: originalUrl,
    description: "柔和圆润 · 适合日文与短句",
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
export type FontId = (typeof fonts)[number]["id"];
export const DEFAULT_FONT: FontId = "irohamaru";
export function getFont(id: FontId) {
  return fonts.find((font) => font.id === id)!;
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
    const face = new FontFace(font.family, `url("${font.url}")`, {
      weight: "400",
      style: "normal",
    });
    await face.load();
    document.fonts.add(face);
  })().catch((error) => {
    pending.delete(id);
    throw error;
  });
  pending.set(id, task);
  return task;
}
export async function loadFont(id: FontId) {
  // The bundled original supplies CJK glyphs missing from the selected font.
  // Cache successful loads, but permit retrying a failed network request.
  await Promise.all([...new Set([DEFAULT_FONT, id])].map(loadFace));
}

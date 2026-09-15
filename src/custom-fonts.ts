export type CustomFontId = `custom-${string}`;
export type CustomFont = {
  id: CustomFontId;
  family: string;
  label: string;
  description: string;
  url: "";
  license: "";
  blob: Blob;
  createdAt: number;
};
export const MAX_CUSTOM_FONTS = 10;
export const MAX_CUSTOM_FONT_BYTES = 20 * 1024 * 1024;
const DB_NAME = "postcard-local-fonts";
const DB_VERSION = 1;
const STORE = "fonts";
const SETTINGS = "settings";
const selectedKey = "selected-font";
let database: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (database) return database;
  database = new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(Error("此浏览器不支持本地字体缓存。"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SETTINGS))
        db.createObjectStore(SETTINGS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? Error("无法打开本地字体缓存。"));
    request.onblocked = () =>
      reject(Error("字体缓存被其他页面占用，请关闭其他标签页后重试。"));
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}
function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? Error("本地字体缓存读取失败。"));
  });
}
function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? Error("本地字体缓存写入失败。"));
    transaction.onabort = () =>
      reject(transaction.error ?? Error("本地字体缓存写入失败。"));
  });
}
export async function readCustomFonts(): Promise<{
  fonts: CustomFont[];
  selected: string | undefined;
}> {
  const db = await openDatabase();
  const tx = db.transaction([STORE, SETTINGS], "readonly");
  const [fonts, selected] = await Promise.all([
    requestValue<CustomFont[]>(tx.objectStore(STORE).getAll()),
    requestValue<string | undefined>(tx.objectStore(SETTINGS).get(selectedKey)),
  ]);
  return { fonts: fonts.sort((a, b) => a.createdAt - b.createdAt), selected };
}
export async function saveFontSelection(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(SETTINGS, "readwrite");
  tx.objectStore(SETTINGS).put(id, selectedKey);
  await completed(tx);
}
export async function storeCustomFont(font: CustomFont): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(font);
  await completed(tx);
}
export async function removeCustomFont(id: CustomFontId): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await completed(tx);
}
export function readFontFormat(
  bytes: Uint8Array,
): "ttf" | "otf" | "woff" | "woff2" {
  if (bytes.length < 32) throw Error("字体文件太短或已损坏。");
  const tag = String.fromCharCode(...bytes.slice(0, 4));
  if (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)
    return "ttf";
  if (tag === "true") return "ttf";
  if (tag === "OTTO") return "otf";
  if (tag === "wOFF") return "woff";
  if (tag === "wOF2") return "woff2";
  throw Error("请选择有效的 TTF、OTF、WOFF 或 WOFF2 字体文件。");
}
export function createCustomFont(file: File): CustomFont {
  const id = `custom-${crypto.randomUUID()}` as CustomFontId;
  const label =
    file.name
      .replace(/\.(ttf|otf|woff2?)$/i, "")
      .trim()
      .slice(0, 80) || "我的字体";
  return {
    id,
    family: `PostcardCustom${id.slice(7).replace(/-/g, "")}`,
    label,
    description: "上传到此浏览器 · 左右文字共用",
    url: "",
    license: "",
    blob: file,
    createdAt: Date.now(),
  };
}

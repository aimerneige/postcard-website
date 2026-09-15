export type ImageInfo = {
  width: number;
  height: number;
  orientation: number;
  mime: string;
};
const unsupported =
  "请选择 JPG、PNG 或静态 WebP；不支持 GIF、SVG、HEIC 和动画图片。";
function exifOrientation(v: DataView, start: number, end: number): number {
  let t = start;
  if (end - t >= 6 && v.getUint32(t) === 0x45786966 && v.getUint16(t + 4) === 0)
    t += 6;
  if (t + 8 > end) return 1;
  const order = v.getUint16(t);
  if (order !== 0x4949 && order !== 0x4d4d) return 1;
  const le = order === 0x4949;
  if (v.getUint16(t + 2, le) !== 42) return 1;
  const ifd = t + v.getUint32(t + 4, le);
  if (ifd < t || ifd + 2 > end) return 1;
  for (let i = 0, count = v.getUint16(ifd, le); i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > end) break;
    if (
      v.getUint16(e, le) === 274 &&
      v.getUint16(e + 2, le) === 3 &&
      v.getUint32(e + 4, le) === 1
    )
      return v.getUint16(e + 8, le);
  }
  return 1;
}
export function inspectImage(buffer: ArrayBuffer): ImageInfo {
  const b = new Uint8Array(buffer),
    v = new DataView(buffer);
  const str = (p: number, n: number) =>
    String.fromCharCode(...b.slice(p, p + n));
  let width = 0,
    height = 0,
    orientation = 1,
    mime = "";
  if (
    b.length >= 24 &&
    str(1, 3) === "PNG" &&
    b[0] === 137 &&
    v.getUint32(4) === 0x0d0a1a0a
  ) {
    mime = "image/png";
    width = v.getUint32(16);
    height = v.getUint32(20);
    for (let p = 8; p + 12 <= b.length;) {
      const len = v.getUint32(p),
        type = str(p + 4, 4);
      if (p + len + 12 > b.length) throw Error("PNG 文件不完整。");
      if (type === "acTL") throw Error("不支持 APNG 动画，请选择静态图片。");
      if (type === "eXIf") orientation = exifOrientation(v, p + 8, p + 8 + len);
      p += len + 12;
    }
  } else if (b.length >= 30 && str(0, 4) === "RIFF" && str(8, 4) === "WEBP") {
    mime = "image/webp";
    for (let p = 12; p + 8 <= b.length;) {
      const type = str(p, 4),
        len = v.getUint32(p + 4, true),
        q = p + 8;
      if (q + len > b.length) throw Error("WebP 文件不完整。");
      if (type === "ANIM" || type === "ANMF" || (type === "VP8X" && b[q] & 2))
        throw Error("不支持动态 WebP，请选择静态图片。");
      if (type === "VP8X" && len >= 10) {
        width = 1 + b[q + 4] + (b[q + 5] << 8) + (b[q + 6] << 16);
        height = 1 + b[q + 7] + (b[q + 8] << 8) + (b[q + 9] << 16);
      }
      if (type === "VP8 " && len >= 10 && !width) {
        width = v.getUint16(q + 6, true) & 16383;
        height = v.getUint16(q + 8, true) & 16383;
      }
      if (type === "VP8L" && len >= 5 && !width) {
        const bits = v.getUint32(q + 1, true);
        width = (bits & 16383) + 1;
        height = ((bits >>> 14) & 16383) + 1;
      }
      if (type === "EXIF") orientation = exifOrientation(v, q, q + len);
      p = q + len + (len % 2);
    }
  } else if (b[0] === 255 && b[1] === 216) {
    mime = "image/jpeg";
    for (let p = 2; p + 4 <= b.length;) {
      if (b[p++] !== 255) throw Error("JPEG 文件结构损坏。");
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const len = v.getUint16(p);
      if (len < 2 || p + len > b.length) throw Error("JPEG 文件不完整。");
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        len >= 8
      ) {
        height = v.getUint16(p + 3);
        width = v.getUint16(p + 5);
      }
      if (marker === 225 && str(p + 2, 6) === "Exif\0\0") {
        orientation = exifOrientation(v, p + 2, p + len);
      }
      p += len;
    }
  } else throw Error(unsupported);
  if (!width || !height) throw Error("无法读取图片尺寸，文件可能已损坏。");
  if (width * height > 40_000_000)
    throw Error("图片超过 40 MP 像素上限，请先缩小图片。");
  if (orientation < 1 || orientation > 8) orientation = 1;
  return { width, height, orientation, mime };
}
export type Source = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  name: string;
  limited: boolean;
};
export async function decodeFile(file: File): Promise<Source> {
  if (file.size > 30 * 1024 * 1024)
    throw Error("文件超过 30 MiB，请选择较小的图片。");
  const data = await file.arrayBuffer();
  let info: ImageInfo;
  try {
    info = inspectImage(data);
  } catch (e) {
    if (e instanceof RangeError) throw Error("文件损坏，无法读取图片。");
    throw e;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([data], { type: info.mime }), {
      imageOrientation: "from-image",
    });
  } catch {
    throw Error("图片解码失败，文件可能损坏或浏览器内存不足。");
  }
  if (bitmap.width * bitmap.height > 40_000_000) {
    bitmap.close();
    throw Error("解码后的图片超过 40 MP。");
  }
  const [w, h] =
    info.orientation >= 5
      ? [info.height, info.width]
      : [info.width, info.height];
  return {
    bitmap,
    width: w,
    height: h,
    name: file.name,
    limited: bitmap.width !== w || bitmap.height !== h,
  };
}

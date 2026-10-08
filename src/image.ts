export type ImageInfo = {
  width: number;
  height: number;
  orientation: number;
  mime: string;
  codestream?: Uint8Array;
};
const unsupported =
  "请选择 JPG、PNG、静态 WebP 或 JXL；不支持 GIF、SVG、HEIC 和动画图片。";
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

class BitReader {
  byteOffset = 2;
  bitOffset = 0;
  constructor(private input: Uint8Array) {}
  getBits(length = 1): number {
    let result = 0,
      bitsRead = 0;
    while (bitsRead < length) {
      if (this.byteOffset >= this.input.length) throw Error("JXL 文件不完整。");
      const currentByte = this.input[this.byteOffset];
      const bitsLeft = 8 - this.bitOffset;
      const bitsToRead = Math.min(length - bitsRead, bitsLeft);
      const mask = (1 << bitsToRead) - 1;
      const bits = (currentByte >> this.bitOffset) & mask;
      result |= bits << bitsRead;
      bitsRead += bitsToRead;
      this.bitOffset += bitsToRead;
      if (this.bitOffset === 8) {
        this.byteOffset++;
        this.bitOffset = 0;
      }
    }
    return result;
  }
}

function jxlU32(
  r: BitReader,
  c0: number,
  c1: number,
  c2: number,
  c3: number,
  u0: number,
  u1: number,
  u2: number,
  u3: number,
): number {
  const constants = [c0, c1, c2, c3];
  const ubits = [u0, u1, u2, u3];
  const choice = r.getBits(2);
  let ret = constants[choice];
  if (ubits[choice]) ret += r.getBits(ubits[choice]);
  return ret;
}

function jxlWidthFromRatio(height: number, ratio: number): number {
  switch (ratio) {
    case 1:
      return height;
    case 2:
      return Math.floor((height * 12) / 10);
    case 3:
      return Math.floor((height * 4) / 3);
    case 4:
      return Math.floor((height * 3) / 2);
    case 5:
      return Math.floor((height * 16) / 9);
    case 6:
      return Math.floor((height * 5) / 4);
    case 7:
      return height * 2;
    default:
      return 0;
  }
}

function readJxlSize(r: BitReader): { width: number; height: number } {
  const small = r.getBits(1) === 1;
  let height = 0,
    width = 0;
  if (small) {
    height = (r.getBits(5) + 1) << 3;
    const ratio = r.getBits(3);
    width = jxlWidthFromRatio(height, ratio);
    if (!width) width = (r.getBits(5) + 1) << 3;
  } else {
    height = 1 + jxlU32(r, 0, 0, 0, 0, 9, 13, 18, 30);
    const ratio = r.getBits(3);
    width = jxlWidthFromRatio(height, ratio);
    if (!width) width = 1 + jxlU32(r, 0, 0, 0, 0, 9, 13, 18, 30);
  }
  return { width, height };
}

function extractJxlCodestream(
  b: Uint8Array,
  v: DataView,
): { codestream: Uint8Array; exifOrientation: number } {
  let p = 0;
  const chunks: Uint8Array[] = [];
  let foundExifOrientation = 1;
  while (p + 8 <= b.length) {
    let size = v.getUint32(p);
    let headerSize = 8;
    if (size === 1) {
      if (p + 16 > b.length) throw Error("JXL 文件不完整。");
      size = Number(v.getBigUint64(p + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = b.length - p;
    }
    if (size < headerSize || p + size > b.length)
      throw Error("JXL 文件不完整。");
    const type = String.fromCharCode(...b.slice(p + 4, p + 8));
    if (type === "jxlc") {
      chunks.push(b.slice(p + headerSize, p + size));
    } else if (type === "jxlp") {
      if (size < headerSize + 4) throw Error("JXL 文件不完整。");
      chunks.push(b.slice(p + headerSize + 4, p + size));
    } else if (type === "Exif") {
      if (size >= headerSize + 4) {
        foundExifOrientation = exifOrientation(v, p + headerSize + 4, p + size);
      }
    }
    p += size;
  }
  if (chunks.length === 0) throw Error("JXL 文件未找到图像数据。");
  if (chunks.length === 1)
    return { codestream: chunks[0], exifOrientation: foundExifOrientation };
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    result.set(c, off);
    off += c.length;
  }
  return { codestream: result, exifOrientation: foundExifOrientation };
}

export function inspectImage(buffer: ArrayBuffer): ImageInfo {
  const b = new Uint8Array(buffer),
    v = new DataView(buffer);
  const str = (p: number, n: number) =>
    String.fromCharCode(...b.slice(p, p + n));
  let width = 0,
    height = 0,
    orientation = 1,
    mime = "",
    codestream: Uint8Array | undefined;
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
  } else if (
    (b.length >= 2 && b[0] === 0xff && b[1] === 0x0a) ||
    (b.length >= 12 &&
      v.getUint32(0) === 0x0000000c &&
      str(4, 4) === "JXL " &&
      v.getUint32(8) === 0x0d0a870a)
  ) {
    mime = "image/jxl";
    let exifOrient = 1;
    if (b[0] === 0xff && b[1] === 0x0a) {
      codestream = b;
    } else {
      const extracted = extractJxlCodestream(b, v);
      codestream = extracted.codestream;
      exifOrient = extracted.exifOrientation;
    }
    if (
      codestream.length < 2 ||
      codestream[0] !== 0xff ||
      codestream[1] !== 0x0a
    ) {
      throw Error("JXL 码流结构损坏。");
    }
    const reader = new BitReader(codestream);
    const sz = readJxlSize(reader);
    width = sz.width;
    height = sz.height;
    const allDefault = reader.getBits(1) === 1;
    let extraFields = false;
    let haveAnimation = false;
    if (!allDefault) extraFields = reader.getBits(1) === 1;
    if (extraFields) {
      orientation = 1 + reader.getBits(3);
      const haveIntrinsicSize = reader.getBits(1) === 1;
      if (haveIntrinsicSize) readJxlSize(reader);
      const havePreview = reader.getBits(1) === 1;
      if (havePreview) {
        const div8 = reader.getBits(1) === 1;
        let ph = div8
          ? jxlU32(reader, 16, 32, 1, 33, 0, 0, 5, 9) << 3
          : jxlU32(reader, 1, 65, 321, 1345, 6, 8, 10, 12);
        const pratio = reader.getBits(3);
        let pw = jxlWidthFromRatio(ph, pratio);
        if (!pw) {
          pw = div8
            ? jxlU32(reader, 16, 32, 1, 33, 0, 0, 5, 9) << 3
            : jxlU32(reader, 1, 65, 321, 1345, 6, 8, 10, 12);
        }
      }
      haveAnimation = reader.getBits(1) === 1;
    }
    if (haveAnimation) throw Error("不支持动态 JXL，请选择静态图片。");
    if (orientation === 1 && exifOrient > 1) orientation = exifOrient;
  } else throw Error(unsupported);
  if (!width || !height) throw Error("无法读取图片尺寸，文件可能已损坏。");
  if (width * height > 40_000_000)
    throw Error("图片超过 40 MP 像素上限，请先缩小图片。");
  if (orientation < 1 || orientation > 8) orientation = 1;
  return { width, height, orientation, mime, codestream };
}
export type Source = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  name: string;
  limited: boolean;
};
export async function decodeFile(file: File): Promise<Source> {
  if (file.size > 128 * 1024 * 1024)
    throw Error("文件超过 128 MiB，请选择较小的图片。");
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
    if (info.mime === "image/jxl" && info.codestream) {
      try {
        const { decodeJxl } = await import("./jxl");
        bitmap = await decodeJxl(info.codestream);
      } catch {
        throw Error("图片解码失败，文件可能损坏或浏览器内存不足。");
      }
    } else {
      throw Error("图片解码失败，文件可能损坏或浏览器内存不足。");
    }
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

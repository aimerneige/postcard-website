import decode from "@jsquash/jxl/decode";

export async function decodeJxl(codestream: Uint8Array): Promise<ImageBitmap> {
  const data = codestream.buffer.slice(
    codestream.byteOffset,
    codestream.byteOffset + codestream.byteLength,
  ) as ArrayBuffer;
  const imageData = await decode(data);
  return await createImageBitmap(imageData);
}

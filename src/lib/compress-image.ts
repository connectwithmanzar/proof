export const COMPRESS_MAX_EDGE = 1600;
export const COMPRESS_QUALITY = 0.72;
const SMALL_BYTES = 400 * 1024;

export const COMPRESS_ERROR =
  "Use JPEG/PNG or Take photo. This file couldn’t be read.";

export class CompressImageError extends Error {
  constructor(message = COMPRESS_ERROR) {
    super(message);
    this.name = "CompressImageError";
  }
}

function isLikelyHeic(blob: Blob): boolean {
  const type = blob.type.toLowerCase();
  return type.includes("heic") || type.includes("heif");
}

async function loadViaImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new CompressImageError());
      el.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadSource(
  blob: Blob,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* fall through — common for HEIC in desktop Chrome */
    }
  }
  return loadViaImage(blob);
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (next) => {
        if (next) resolve(next);
        else reject(new CompressImageError());
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function compressImage(
  file: Blob,
  opts?: { maxEdge?: number; quality?: number },
): Promise<Blob> {
  const maxEdge = opts?.maxEdge ?? COMPRESS_MAX_EDGE;
  const quality = opts?.quality ?? COMPRESS_QUALITY;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadSource(file);
  } catch (error) {
    if (error instanceof CompressImageError) throw error;
    if (isLikelyHeic(file)) throw new CompressImageError();
    throw new CompressImageError();
  }

  const width = "width" in source ? source.width : 0;
  const height = "height" in source ? source.height : 0;
  if (!width || !height) {
    throw new CompressImageError();
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CompressImageError();
  ctx.drawImage(source, 0, 0, targetW, targetH);
  if ("close" in source) source.close();

  const jpeg = await canvasToJpeg(canvas, quality);

  if (
    process.env.NODE_ENV === "development" &&
    typeof console !== "undefined"
  ) {
    console.info(
      `[Reckoning] compress ${Math.round(file.size / 1024)}KB → ${Math.round(jpeg.size / 1024)}KB`,
    );
  }

  if (file.size < SMALL_BYTES && scale === 1 && jpeg.size > file.size) {
    return jpeg;
  }

  return jpeg;
}

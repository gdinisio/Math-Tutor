/**
 * Client-side image preparation.
 *
 * Photos straight off a phone are 3–12 MB each. Base64-encoding those into a
 * JSON body inflates them by a further ~33%, which blows past the ~4.5 MB
 * request limit on Vercel long before the model ever sees them. We downscale
 * and re-encode in the browser so a multi-page submission stays well inside the
 * budget — and so we aren't paying to send the model detail it downsamples away
 * anyway (most vision models cap out around 1500px on the long edge).
 */

/** Longest edge, in pixels, of a prepared image. */
const MAX_EDGE = 1600;

/** JPEG quality for the first pass. High enough to keep pencil working legible. */
const QUALITY = 0.85;

/**
 * Budget for the combined base64 payload. Vercel rejects request bodies over
 * ~4.5 MB; we leave headroom for the JSON envelope and the prompt.
 */
const MAX_TOTAL_BASE64_BYTES = 3_500_000;

/** Refuse absurd source files before we try to decode them. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export interface PreparedImage {
  dataUrl: string;
  /** Approximate encoded size, for the payload budget. */
  bytes: number;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // `from-image` applies the EXIF orientation, so photos taken in
      // landscape don't arrive at the model rotated 90°.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> path below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not read ${file.name}`));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function draw(
  source: ImageBitmap | HTMLImageElement,
  maxEdge: number,
  quality: number,
): string {
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height =
    "naturalHeight" in source ? source.naturalHeight : source.height;

  if (!width || !height) {
    throw new Error("Image has no dimensions");
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  // Photos of paper are mostly white; filling first avoids black edges when a
  // source with an alpha channel (e.g. a PNG screenshot) is flattened to JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
}

/** Bytes of raw data represented by a base64 data URL. */
function encodedBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function prepareOne(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<PreparedImage> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`${file.name} is too large (max 25 MB)`);
  }

  let dataUrl: string;
  try {
    const source = await decode(file);
    dataUrl = draw(source, maxEdge, quality);
    if ("close" in source) source.close();
  } catch {
    // If the browser can't decode or re-encode it, send the original and let
    // the payload guard below decide whether it fits.
    dataUrl = await readAsDataUrl(file);
  }

  return { dataUrl, bytes: encodedBytes(dataUrl) };
}

/**
 * Downscale and re-encode every file, tightening the settings if the combined
 * payload is still over budget. Throws if it can't be made to fit.
 */
export async function prepareImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  const passes: Array<{ maxEdge: number; quality: number }> = [
    { maxEdge: MAX_EDGE, quality: QUALITY },
    { maxEdge: 1280, quality: 0.75 },
    { maxEdge: 1024, quality: 0.65 },
  ];

  let prepared: PreparedImage[] = [];

  for (const pass of passes) {
    prepared = await Promise.all(
      files.map((file) => prepareOne(file, pass.maxEdge, pass.quality)),
    );

    const total = prepared.reduce((sum, img) => sum + img.bytes, 0);
    if (total <= MAX_TOTAL_BASE64_BYTES) {
      return prepared.map((img) => img.dataUrl);
    }
  }

  throw new Error(
    `These images are too large to send even after compression (${files.length} files). Try submitting fewer pages at a time.`,
  );
}

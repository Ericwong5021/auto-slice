import sharp from 'sharp';
import { logger } from '../utils/logger.js';

export interface BgRemoveOptions {
  /** Sensitivity for background detection (0-1). Lower = more aggressive removal. */
  sensitivity?: number;
  /** Output format */
  format?: 'png' | 'jpg';
}

/**
 * Remove the background from an image, producing a transparent PNG.
 *
 * Detects the background color from the image edges and replaces matching
 * pixels with transparency.
 */
export async function bgRemove(
  inputPath: string,
  outputPath: string,
  opts: BgRemoveOptions = {},
): Promise<string> {
  const { sensitivity = 0.3, format = 'png' } = opts;

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width === 0 || height === 0) {
    throw new Error(`Cannot read image dimensions: ${inputPath}`);
  }

  // Get raw RGBA data
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;

  // Detect background color from edges
  const bgColor = detectEdgeColor(data, channels, width, height);
  logger.debug(
    `Detected background: rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${bgColor.a})`,
  );

  // Replace matching pixels with transparency
  const totalPixels = width * height;
  const output = Buffer.alloc(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const srcOffset = i * channels;
    const dstOffset = i * 4;

    const r = data[srcOffset];
    const g = data[srcOffset + 1];
    const b = data[srcOffset + 2];
    const a = channels >= 4 ? data[srcOffset + 3] : 255;

    const dist = Math.sqrt(
      (r - bgColor.r) ** 2 +
        (g - bgColor.g) ** 2 +
        (b - bgColor.b) ** 2 +
        (a - bgColor.a) ** 2,
    ) / 2;

    if (dist <= sensitivity * 255) {
      // Background pixel — make transparent
      output[dstOffset] = r;
      output[dstOffset + 1] = g;
      output[dstOffset + 2] = b;
      output[dstOffset + 3] = 0;
    } else {
      // Foreground pixel — keep as is
      output[dstOffset] = r;
      output[dstOffset + 1] = g;
      output[dstOffset + 2] = b;
      output[dstOffset + 3] = a;
    }
  }

  // Write output
  await sharp(output, {
    raw: { width, height, channels: 4 },
  })
    .toFormat(format, { quality: 90 })
    .toFile(outputPath);

  logger.info(`Background removed → ${outputPath}`);
  return outputPath;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function detectEdgeColor(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
): RGBA {
  const samples: RGBA[] = [];

  // Sample top and bottom edges
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 20))) {
    for (const y of [0, height - 1]) {
      const offset = (y * width + x) * channels;
      samples.push({
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
        a: channels >= 4 ? data[offset + 3] : 255,
      });
    }
  }

  // Sample left and right edges
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 20))) {
    for (const x of [0, width - 1]) {
      const offset = (y * width + x) * channels;
      samples.push({
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
        a: channels >= 4 ? data[offset + 3] : 255,
      });
    }
  }

  // Find the most common color among samples (mode)
  const colorMap = new Map<string, { color: RGBA; count: number }>();
  for (const s of samples) {
    const key = `${s.r},${s.g},${s.b},${s.a}`;
    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { color: s, count: 1 });
    }
  }

  let maxCount = 0;
  let dominant: RGBA = samples[0];
  for (const { color, count } of colorMap.values()) {
    if (count > maxCount) {
      maxCount = count;
      dominant = color;
    }
  }

  return dominant;
}

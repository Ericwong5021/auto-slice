import sharp from 'sharp';
import { logger } from '../utils/logger.js';

export interface BgReplaceOptions {
  /** Sensitivity for background detection (0-1) */
  sensitivity?: number;
  /** Hex color to replace background with, e.g. '#ff0000' or 'red' */
  replacementColor?: string;
  /** Output format */
  format?: 'png' | 'jpg';
}

/**
 * Replace the background color of an image with a new color.
 */
export async function bgReplace(
  inputPath: string,
  outputPath: string,
  opts: BgReplaceOptions = {},
): Promise<string> {
  const {
    sensitivity = 0.3,
    replacementColor = '#ffffff',
    format = 'png',
  } = opts;

  // Parse replacement color
  const repColor = parseColor(replacementColor);

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width === 0 || height === 0) {
    throw new Error(`Cannot read image dimensions: ${inputPath}`);
  }

  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;

  // Detect background color
  const bgColor = detectEdgeColor(data, channels, width, height);
  logger.debug(
    `Detected background: rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${bgColor.a})`,
  );
  logger.debug(
    `Replacement color: rgba(${repColor.r}, ${repColor.g}, ${repColor.b}, ${repColor.a})`,
  );

  // Replace matching pixels
  const totalPixels = width * height;
  const output = Buffer.alloc(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const srcOffset = i * channels;
    const dstOffset = i * 4;

    const r = data[srcOffset];
    const g = data[srcOffset + 1];
    const b = data[srcOffset + 2];
    const a = channels >= 4 ? data[srcOffset + 3] : 255;

    const dist =
      Math.sqrt(
        (r - bgColor.r) ** 2 +
          (g - bgColor.g) ** 2 +
          (b - bgColor.b) ** 2 +
          (a - bgColor.a) ** 2,
      ) / 2;

    if (dist <= sensitivity * 255) {
      // Background pixel — replace with new color
      output[dstOffset] = repColor.r;
      output[dstOffset + 1] = repColor.g;
      output[dstOffset + 2] = repColor.b;
      output[dstOffset + 3] = repColor.a;
    } else {
      // Foreground — keep
      output[dstOffset] = r;
      output[dstOffset + 1] = g;
      output[dstOffset + 2] = b;
      output[dstOffset + 3] = a;
    }
  }

  await sharp(output, {
    raw: { width, height, channels: 4 },
  })
    .toFormat(format, { quality: 90 })
    .toFile(outputPath);

  logger.info(`Background replaced → ${outputPath}`);
  return outputPath;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(color: string): RGBA {
  // Handle named colors
  const named: Record<string, RGBA> = {
    white: { r: 255, g: 255, b: 255, a: 255 },
    black: { r: 0, g: 0, b: 0, a: 255 },
    red: { r: 255, g: 0, b: 0, a: 255 },
    green: { r: 0, g: 128, b: 0, a: 255 },
    blue: { r: 0, g: 0, b: 255, a: 255 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
  };

  if (named[color.toLowerCase()]) {
    return named[color.toLowerCase()];
  }

  // Parse hex
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 255,
    };
  }
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16),
    };
  }

  throw new Error(`Invalid color: ${color}. Use hex (#rrggbb) or named color.`);
}

function detectEdgeColor(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
): RGBA {
  const samples: RGBA[] = [];

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

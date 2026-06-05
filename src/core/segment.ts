import sharp, { Sharp, OverlayOptions } from 'sharp';
import { logger } from '../utils/logger.js';

export interface SegmentOptions {
  /** Sensitivity for background detection (0-1). Lower = more aggressive. */
  sensitivity?: number;
  /** Minimum region area as percentage of total image (0-1) */
  minRegionArea?: number;
  /** Output format */
  format?: 'png' | 'jpg';
  /** Padding around detected regions in pixels */
  padding?: number;
}

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detect non-background regions in an image and extract them as separate images.
 *
 * Uses a flood-fill approach from the corners to identify the background color,
 * then finds connected non-background regions and crops them out.
 */
export async function segment(
  inputPath: string,
  outputPath: string,
  opts: SegmentOptions = {},
): Promise<string[]> {
  const {
    sensitivity = 0.3,
    minRegionArea = 0.005,
    format = 'png',
    padding = 4,
  } = opts;

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width === 0 || height === 0) {
    throw new Error(`Cannot read image dimensions: ${inputPath}`);
  }

  logger.debug(`Image: ${width}x${height}`);

  // Get raw RGBA pixel data
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const totalPixels = width * height;

  // Detect background color from corner pixels
  const bgColor = detectBackgroundColor(data, channels, width, height);
  logger.debug(
    `Background color: rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${bgColor.a})`,
  );

  // Create a binary mask: 1 = foreground, 0 = background
  const mask = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = channels >= 4 ? data[offset + 3] : 255;

    const dist = colorDistance(
      { r, g, b, a },
      bgColor,
    );

    // Pixel is foreground if it differs enough from background
    mask[i] = dist > sensitivity * 255 ? 1 : 0;
  }

  // Find connected regions using flood fill
  const visited = new Uint8Array(totalPixels);
  const regions: Region[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1 && visited[idx] === 0) {
        const region = floodFill(mask, visited, x, y, width, height);
        const area =
          (region.width * region.height) / totalPixels;
        if (area >= minRegionArea) {
          regions.push(region);
        }
      }
    }
  }

  logger.info(`Found ${regions.length} regions`);

  if (regions.length === 0) {
    // No distinct regions found — treat the whole image as one region
    regions.push({ x: 0, y: 0, width, height });
  }

  // Extract each region
  const outputPaths: string[] = [];
  const ext = format === 'jpg' ? 'jpg' : 'png';

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const x = Math.max(0, r.x - padding);
    const y = Math.max(0, r.y - padding);
    const w = Math.min(width - x, r.width + padding * 2);
    const h = Math.min(height - y, r.height + padding * 2);

    const regionPath = outputPath.replace(
      /\.(png|jpg|jpeg)$/i,
      `_${i + 1}.${ext}`,
    );

    await sharp(inputPath)
      .extract({ left: x, top: y, width: w, height: h })
      .toFormat(format, { quality: 90 })
      .toFile(regionPath);

    outputPaths.push(regionPath);
    logger.debug(`Extracted region ${i + 1}: ${w}x${h} → ${regionPath}`);
  }

  return outputPaths;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function detectBackgroundColor(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
): RGBA {
  // Sample corners and edges to find the most common edge color
  const samples: RGBA[] = [];
  const samplePoints = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  for (const [x, y] of samplePoints) {
    const offset = (y * width + x) * channels;
    samples.push({
      r: data[offset],
      g: data[offset + 1],
      b: data[offset + 2],
      a: channels >= 4 ? data[offset + 3] : 255,
    });
  }

  // Use the first corner color as background (most images have consistent edges)
  return samples[0];
}

function colorDistance(a: RGBA, b: RGBA): number {
  // Weighted Euclidean distance in RGBA space
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const da = a.a - b.a;
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da) / 2;
}

function floodFill(
  mask: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number,
): Region {
  const stack: [number, number][] = [[startX, startY]];
  let minX = startX,
    maxX = startX,
    minY = startY,
    maxY = startY;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] === 1 || mask[idx] === 0) continue;

    visited[idx] = 1;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

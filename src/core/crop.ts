import sharp from 'sharp';
import { logger } from '../utils/logger.js';

export interface CropOptions {
  /** Crop width in pixels */
  width?: number;
  /** Crop height in pixels */
  height?: number;
  /** Gravity for auto-crop: north, northeast, east, southeast, south, southwest, west, northwest, center */
  gravity?: string;
  /** Trim transparent/white borders */
  trim?: boolean;
  /** Output format */
  format?: 'png' | 'jpg';
}

/**
 * Crop an image to specified dimensions or auto-crop based on content.
 */
export async function crop(
  inputPath: string,
  outputPath: string,
  opts: CropOptions = {},
): Promise<string> {
  const {
    width,
    height,
    gravity = 'center',
    trim = false,
    format = 'png',
  } = opts;

  let pipeline = sharp(inputPath);

  if (trim) {
    // Auto-trim whitespace/transparent borders
    pipeline = pipeline.trim();
    logger.debug('Trimming borders');
  }

  if (width && height) {
    // Resize and crop to exact dimensions
    pipeline = pipeline.resize(width, height, {
      fit: 'cover',
      position: gravity,
    });
    logger.debug(`Cropping to ${width}x${height} (gravity: ${gravity})`);
  } else if (width) {
    pipeline = pipeline.resize(width, null, {
      fit: 'inside',
    });
    logger.debug(`Resizing to width ${width}`);
  } else if (height) {
    pipeline = pipeline.resize(null, height, {
      fit: 'inside',
    });
    logger.debug(`Resizing to height ${height}`);
  }

  await pipeline.toFormat(format, { quality: 90 }).toFile(outputPath);

  logger.info(`Cropped → ${outputPath}`);
  return outputPath;
}

import { readdir, stat } from 'node:fs/promises';
import { resolve, join, basename, extname } from 'node:path';
import { logger } from '../utils/logger.js';
import { createProgress, type ProgressReporter } from '../utils/progress.js';
import { bgRemove, type BgRemoveOptions } from './bgRemove.js';
import { bgReplace, type BgReplaceOptions } from './bgReplace.js';
import { crop, type CropOptions } from './crop.js';
import { segment, type SegmentOptions } from './segment.js';

export type BatchOperation = 'bg-remove' | 'bg-replace' | 'crop' | 'segment';

export interface BatchOptions {
  operation: BatchOperation;
  inputDir: string;
  outputDir: string;
  /** File extensions to process (without dot) */
  extensions?: string[];
  /** Max concurrent operations */
  concurrency?: number;
  /** Operation-specific options */
  opOptions?: BgRemoveOptions | BgReplaceOptions | CropOptions | SegmentOptions;
  /** Progress reporter */
  progress?: ProgressReporter;
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp']);

async function collectImages(
  dir: string,
  extensions?: string[],
): Promise<string[]> {
  const exts = extensions?.map((e) => e.toLowerCase()) ?? Array.from(IMAGE_EXTENSIONS);
  const files: string[] = [];

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).slice(1).toLowerCase();
        if (exts.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return files.sort();
}

/**
 * Process a batch of images with the specified operation.
 * Returns an array of output file paths.
 */
export async function batchProcess(
  opts: BatchOptions,
): Promise<string[]> {
  const {
    operation,
    inputDir,
    outputDir,
    extensions,
    concurrency = 4,
    opOptions = {},
    progress: externalProgress,
  } = opts;

  const images = await collectImages(inputDir, extensions);
  if (images.length === 0) {
    logger.warn(`No images found in ${inputDir}`);
    return [];
  }

  logger.info(`Found ${images.length} images to process`);

  const progress = externalProgress ?? createProgress(false);
  progress.start(images.length, `Processing (${operation})`);

  const results: string[] = [];

  // Process in batches for concurrency control
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    const promises = batch.map(async (imgPath) => {
      const name = basename(imgPath, extname(imgPath));
      const ext = (opOptions as any).format ?? 'png';
      const outputPath = resolve(outputDir, `${name}.${ext}`);

      try {
        switch (operation) {
          case 'bg-remove':
            await bgRemove(imgPath, outputPath, opOptions as BgRemoveOptions);
            break;
          case 'bg-replace':
            await bgReplace(imgPath, outputPath, opOptions as BgReplaceOptions);
            break;
          case 'crop':
            await crop(imgPath, outputPath, opOptions as CropOptions);
            break;
          case 'segment': {
            const segmentDir = resolve(outputDir, name);
            const { mkdirSync } = await import('node:fs');
            mkdirSync(segmentDir, { recursive: true });
            const segmentOutput = resolve(segmentDir, `${name}.png`);
            const paths = await segment(imgPath, segmentOutput, opOptions as SegmentOptions);
            results.push(...paths);
            break;
          }
        }

        if (operation !== 'segment') {
          results.push(outputPath);
        }

        progress.increment(basename(imgPath));
      } catch (err) {
        logger.error(`Failed to process ${imgPath}: ${err}`);
        progress.increment(`ERROR: ${basename(imgPath)}`);
      }
    });

    await Promise.all(promises);
  }

  progress.stop();
  logger.success(`Batch complete: ${results.length}/${images.length} succeeded`);
  return results;
}

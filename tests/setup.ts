import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

export const TEST_DIR = join(process.cwd(), '.test-tmp');
export const INPUT_DIR = join(TEST_DIR, 'input');
export const OUTPUT_DIR = join(TEST_DIR, 'output');

export async function setupTestImages(): Promise<void> {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(INPUT_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Create a test image: white background with a red rectangle in the center
  const width = 200;
  const height = 200;
  const channels = 4;
  const pixels = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      // Default: white background
      pixels[offset] = 255;     // R
      pixels[offset + 1] = 255; // G
      pixels[offset + 2] = 255; // B
      pixels[offset + 3] = 255; // A

      // Red rectangle in center (50x50)
      if (x >= 75 && x < 125 && y >= 75 && y < 125) {
        pixels[offset] = 255;     // R
        pixels[offset + 1] = 0;   // G
        pixels[offset + 2] = 0;   // B
        pixels[offset + 3] = 255; // A
      }
    }
  }

  await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toFile(join(INPUT_DIR, 'test.png'));

  // Create a second test image: blue background with green circle
  const pixels2 = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      // Blue background
      pixels2[offset] = 0;
      pixels2[offset + 1] = 0;
      pixels2[offset + 2] = 255;
      pixels2[offset + 3] = 255;

      // Green circle in center
      const cx = x - 100;
      const cy = y - 100;
      if (cx * cx + cy * cy <= 30 * 30) {
        pixels2[offset] = 0;
        pixels2[offset + 1] = 200;
        pixels2[offset + 2] = 0;
        pixels2[offset + 3] = 255;
      }
    }
  }

  await sharp(pixels2, { raw: { width, height, channels } })
    .png()
    .toFile(join(INPUT_DIR, 'test2.png'));
}

export function cleanupTestDir(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

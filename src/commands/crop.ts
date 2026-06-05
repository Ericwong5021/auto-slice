import { Command } from 'commander';
import { resolve } from 'node:path';
import { crop } from '../core/crop.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';

export function registerCropCommand(program: Command): void {
  program
    .command('crop')
    .description('Crop or resize an image')
    .argument('<input>', 'Input image path')
    .option('-o, --output <path>', 'Output file path')
    .option('-W, --width <number>', 'Target width in pixels')
    .option('-H, --height <number>', 'Target height in pixels')
    .option(
      '-g, --gravity <position>',
      'Crop gravity (north, south, east, west, center, etc.)',
      'center',
    )
    .option('--trim', 'Auto-trim transparent/white borders', false)
    .option('-f, --format <format>', 'Output format (png, jpg)', 'png')
    .option('-c, --config <path>', 'Path to config file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, opts) => {
      try {
        const config = loadConfig(opts.config);
        if (opts.verbose) logger.info('Verbose mode enabled');

        const inputPath = resolve(input);
        const outputPath = opts.output
          ? resolve(opts.output)
          : inputPath.replace(/\.(png|jpg|jpeg)$/i, '_cropped.png');

        logger.info(`Cropping: ${inputPath}`);

        const result = await crop(inputPath, outputPath, {
          width: opts.width ? parseInt(opts.width, 10) : undefined,
          height: opts.height ? parseInt(opts.height, 10) : undefined,
          gravity: opts.gravity,
          trim: opts.trim,
          format: opts.format as 'png' | 'jpg',
        });

        logger.success(`Done → ${result}`);
        logger.out(result);
      } catch (err) {
        logger.error(`Crop failed: ${err}`);
        process.exit(1);
      }
    });
}

import { Command } from 'commander';
import { resolve } from 'node:path';
import { segment } from '../core/segment.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';

export function registerSegmentCommand(program: Command): void {
  program
    .command('segment')
    .alias('seg')
    .description('Split an image into individual elements (transparent background assets)')
    .argument('<input>', 'Input image path')
    .option('-o, --output <path>', 'Output path (uses input name + _N.png pattern)')
    .option('-f, --format <format>', 'Output format (png, jpg)', 'png')
    .option('-s, --sensitivity <number>', 'Background detection sensitivity (0-1)', '0.3')
    .option('--min-area <number>', 'Minimum region area as fraction of image (0-1)', '0.005')
    .option('--padding <number>', 'Padding around regions in pixels', '4')
    .option('-c, --config <path>', 'Path to config file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, opts) => {
      try {
        const config = loadConfig(opts.config);
        if (opts.verbose) logger.info('Verbose mode enabled');

        const inputPath = resolve(input);
        const outputPath = opts.output
          ? resolve(opts.output)
          : inputPath.replace(/\.(png|jpg|jpeg)$/i, '_segmented.png');

        logger.info(`Segmenting: ${inputPath}`);

        const results = await segment(inputPath, outputPath, {
          sensitivity: parseFloat(opts.sensitivity),
          minRegionArea: parseFloat(opts.minArea),
          format: opts.format as 'png' | 'jpg',
          padding: parseInt(opts.padding, 10),
        });

        logger.success(`Extracted ${results.length} regions:`);
        for (const p of results) {
          logger.out(p);
        }
      } catch (err) {
        logger.error(`Segment failed: ${err}`);
        process.exit(1);
      }
    });
}

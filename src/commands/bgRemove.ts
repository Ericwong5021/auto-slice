import { Command } from 'commander';
import { resolve } from 'node:path';
import { bgRemove } from '../core/bgRemove.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';

export function registerBgRemoveCommand(program: Command): void {
  program
    .command('bg-remove')
    .alias('br')
    .description('Remove background from an image (produces transparent PNG)')
    .argument('<input>', 'Input image path')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', 'Output format (png, jpg)', 'png')
    .option('-s, --sensitivity <number>', 'Background detection sensitivity (0-1)', '0.3')
    .option('-c, --config <path>', 'Path to config file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, opts) => {
      try {
        const config = loadConfig(opts.config);
        if (opts.verbose) logger.info('Verbose mode enabled');

        const inputPath = resolve(input);
        const outputPath = opts.output
          ? resolve(opts.output)
          : inputPath.replace(/\.(png|jpg|jpeg)$/i, '_nobg.png');

        logger.info(`Removing background: ${inputPath}`);

        const result = await bgRemove(inputPath, outputPath, {
          sensitivity: parseFloat(opts.sensitivity),
          format: opts.format as 'png' | 'jpg',
        });

        logger.success(`Done → ${result}`);
        logger.out(result);
      } catch (err) {
        logger.error(`Background removal failed: ${err}`);
        process.exit(1);
      }
    });
}

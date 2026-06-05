import { Command } from 'commander';
import { resolve } from 'node:path';
import { bgReplace } from '../core/bgReplace.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';

export function registerBgReplaceCommand(program: Command): void {
  program
    .command('bg-replace')
    .alias('bgr')
    .description('Replace background color of an image')
    .argument('<input>', 'Input image path')
    .argument('[color]', 'Replacement color (hex like #ff0000 or named like red)', '#ffffff')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', 'Output format (png, jpg)', 'png')
    .option('-s, --sensitivity <number>', 'Background detection sensitivity (0-1)', '0.3')
    .option('-c, --config <path>', 'Path to config file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, color: string, opts) => {
      try {
        const config = loadConfig(opts.config);
        if (opts.verbose) logger.info('Verbose mode enabled');

        const inputPath = resolve(input);
        const outputPath = opts.output
          ? resolve(opts.output)
          : inputPath.replace(/\.(png|jpg|jpeg)$/i, '_bgreplaced.png');

        logger.info(`Replacing background of: ${inputPath}`);
        logger.info(`New color: ${color}`);

        const result = await bgReplace(inputPath, outputPath, {
          sensitivity: parseFloat(opts.sensitivity),
          replacementColor: color,
          format: opts.format as 'png' | 'jpg',
        });

        logger.success(`Done → ${result}`);
        logger.out(result);
      } catch (err) {
        logger.error(`Background replacement failed: ${err}`);
        process.exit(1);
      }
    });
}

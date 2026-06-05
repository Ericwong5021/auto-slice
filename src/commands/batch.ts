import { Command } from 'commander';
import { resolve } from 'node:path';
import { batchProcess, type BatchOperation } from '../core/batch.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';

export function registerBatchCommand(program: Command): void {
  program
    .command('batch')
    .description('Process multiple images in a directory')
    .argument('<operation>', 'Operation to apply: bg-remove, bg-replace, crop, segment')
    .argument('<input-dir>', 'Input directory containing images')
    .option('-o, --output-dir <path>', 'Output directory', './output')
    .option('-e, --extensions <list>', 'Comma-separated file extensions to process')
    .option('-j, --concurrency <number>', 'Max concurrent operations', '4')
    .option('--bg-color <color>', 'Background replacement color (for bg-replace)', '#ffffff')
    .option('-W, --width <number>', 'Crop width (for crop)')
    .option('-H, --height <number>', 'Crop height (for crop)')
    .option('-s, --sensitivity <number>', 'Background detection sensitivity (0-1)', '0.3')
    .option('-f, --format <format>', 'Output format (png, jpg)', 'png')
    .option('-c, --config <path>', 'Path to config file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (operation: string, inputDir: string, opts) => {
      try {
        const config = loadConfig(opts.config);
        if (opts.verbose) logger.info('Verbose mode enabled');

        const validOps: BatchOperation[] = [
          'bg-remove',
          'bg-replace',
          'crop',
          'segment',
        ];
        if (!validOps.includes(operation as BatchOperation)) {
          logger.error(
            `Invalid operation: ${operation}. Must be one of: ${validOps.join(', ')}`,
          );
          process.exit(1);
        }

        const outputDir = resolve(opts.outputDir);
        const { mkdirSync } = await import('node:fs');
        mkdirSync(outputDir, { recursive: true });

        logger.info(`Batch ${operation}: ${resolve(inputDir)} → ${outputDir}`);

        const extensions = opts.extensions
          ? opts.extensions.split(',').map((e: string) => e.trim())
          : undefined;

        const opOptions: Record<string, any> = {
          sensitivity: parseFloat(opts.sensitivity),
          format: opts.format,
        };

        if (operation === 'bg-replace') {
          opOptions.replacementColor = opts.bgColor;
        }
        if (operation === 'crop') {
          if (opts.width) opOptions.width = parseInt(opts.width, 10);
          if (opts.height) opOptions.height = parseInt(opts.height, 10);
        }

        const results = await batchProcess({
          operation: operation as BatchOperation,
          inputDir: resolve(inputDir),
          outputDir,
          extensions,
          concurrency: parseInt(opts.concurrency, 10),
          opOptions,
        });

        logger.success(`Batch complete: ${results.length} files produced`);
        for (const p of results) {
          logger.out(p);
        }
      } catch (err) {
        logger.error(`Batch failed: ${err}`);
        process.exit(1);
      }
    });
}

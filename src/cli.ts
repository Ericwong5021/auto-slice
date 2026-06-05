#!/usr/bin/env node

import { Command } from 'commander';
import { registerSegmentCommand } from './commands/segment.js';
import { registerBgRemoveCommand } from './commands/bgRemove.js';
import { registerBgReplaceCommand } from './commands/bgReplace.js';
import { registerCropCommand } from './commands/crop.js';
import { registerBatchCommand } from './commands/batch.js';
import { setLogLevel } from './utils/logger.js';

const program = new Command();

program
  .name('auto-slice')
  .description(
    'AI-powered image segmentation and background processing CLI tool.\n\n' +
      'Automatically split images into individual transparent assets,\n' +
      'remove or replace backgrounds, and crop with smart detection.',
  )
  .version('0.1.0')
  .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.logLevel) {
      setLogLevel(opts.logLevel);
    }
  });

// Register all commands
registerSegmentCommand(program);
registerBgRemoveCommand(program);
registerBgReplaceCommand(program);
registerCropCommand(program);
registerBatchCommand(program);

// Handle stdin pipe support
program.argument('[input]', 'Input image (for pipe mode)');

program.parse();

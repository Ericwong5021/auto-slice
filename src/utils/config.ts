import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { logger } from './logger.js';

export interface SliceConfig {
  /** Default output directory */
  outputDir: string;
  /** Default export format */
  format: 'png' | 'jpg';
  /** JPEG quality (1-100) */
  quality: number;
  /** Background removal sensitivity (0-1) */
  bgSensitivity: number;
  /** Background color to replace with (hex) */
  bgColor: string;
  /** Max concurrent batch operations */
  concurrency: number;
  /** Verbose logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: SliceConfig = {
  outputDir: './output',
  format: 'png',
  quality: 90,
  bgSensitivity: 0.3,
  bgColor: '#ffffff',
  concurrency: 4,
  verbose: false,
};

const CONFIG_FILE_NAMES = [
  '.auto-slice.json',
  '.auto-slicerc',
  'auto-slice.config.json',
];

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    for (const name of CONFIG_FILE_NAMES) {
      const filePath = resolve(dir, name);
      if (existsSync(filePath)) return filePath;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // Also check home directory
  const homeConfig = resolve(homedir(), '.auto-slice.json');
  if (existsSync(homeConfig)) return homeConfig;
  return null;
}

export function loadConfig(configPath?: string): SliceConfig {
  const config = { ...DEFAULT_CONFIG };

  const filePath = configPath ?? findConfigFile(process.cwd());
  if (filePath) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      Object.assign(config, parsed);
      logger.debug(`Loaded config from ${filePath}`);
    } catch (err) {
      logger.warn(`Failed to load config from ${filePath}: ${err}`);
    }
  }

  return config;
}

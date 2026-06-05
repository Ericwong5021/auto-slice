import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

export const logger = {
  debug(msg: string): void {
    if (shouldLog('debug')) {
      console.error(chalk.gray(`[debug] ${msg}`));
    }
  },

  info(msg: string): void {
    if (shouldLog('info')) {
      console.error(chalk.blue(`[info] ${msg}`));
    }
  },

  warn(msg: string): void {
    if (shouldLog('warn')) {
      console.error(chalk.yellow(`[warn] ${msg}`));
    }
  },

  error(msg: string): void {
    if (shouldLog('error')) {
      console.error(chalk.red(`[error] ${msg}`));
    }
  },

  success(msg: string): void {
    console.error(chalk.green(`[ok] ${msg}`));
  },

  /** Print a line to stdout (for piped output). */
  out(msg: string): void {
    console.log(msg);
  },
};

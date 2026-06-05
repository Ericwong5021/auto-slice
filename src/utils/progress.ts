import cliProgress from 'cli-progress';
import chalk from 'chalk';

export interface ProgressReporter {
  start(total: number, label: string): void;
  increment(label?: string): void;
  stop(): void;
}

export class BarProgress implements ProgressReporter {
  private bar: cliProgress.SingleBar | null = null;

  start(total: number, label: string): void {
    this.bar = new cliProgress.SingleBar(
      {
        format:
          `${chalk.cyan('{bar}')} | {percentage}% | {value}/{total} | ${chalk.green('{task}')}`,
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic,
    );
    this.bar.start(total, 0, { task: label });
  }

  increment(label?: string): void {
    if (this.bar) {
      this.bar.increment(1, { task: label ?? '' });
    }
  }

  stop(): void {
    if (this.bar) {
      this.bar.stop();
      this.bar = null;
    }
  }
}

/** No-op progress for piped / quiet mode. */
export class NoopProgress implements ProgressReporter {
  start(): void {}
  increment(): void {}
  stop(): void {}
}

export function createProgress(verbose: boolean): ProgressReporter {
  // When piped (no TTY) or verbose, skip the bar
  if (verbose || !process.stderr.isTTY) {
    return new NoopProgress();
  }
  return new BarProgress();
}

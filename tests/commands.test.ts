import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setupTestImages, cleanupTestDir, TEST_DIR, INPUT_DIR, OUTPUT_DIR } from './setup.js';

const exec = promisify(execFile);
const CLI = join(process.cwd(), 'dist', 'cli.js');

describe('auto-slice CLI', () => {
  beforeAll(async () => {
    await setupTestImages();
  }, 30000);

  afterAll(() => {
    cleanupTestDir();
  });

  it('shows version', async () => {
    const { stdout } = await exec('node', [CLI, '--version']);
    expect(stdout.trim()).toBe('0.1.0');
  });

  it('shows help', async () => {
    const { stdout } = await exec('node', [CLI, '--help']);
    expect(stdout).toContain('auto-slice');
    expect(stdout).toContain('segment');
    expect(stdout).toContain('bg-remove');
    expect(stdout).toContain('bg-replace');
    expect(stdout).toContain('crop');
    expect(stdout).toContain('batch');
  });

  it('segment command works', async () => {
    const inputPath = join(INPUT_DIR, 'test.png');
    const outputPath = join(OUTPUT_DIR, 'test_seg.png');
    const { stdout } = await exec('node', [
      CLI, 'segment', inputPath,
      '-o', outputPath,
      '-s', '0.3',
    ]);
    expect(stdout).toContain('test_seg');
  });

  it('bg-remove command works', async () => {
    const inputPath = join(INPUT_DIR, 'test.png');
    const outputPath = join(OUTPUT_DIR, 'test_nobg.png');
    const { stdout } = await exec('node', [
      CLI, 'bg-remove', inputPath,
      '-o', outputPath,
    ]);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('bg-replace command works', async () => {
    const inputPath = join(INPUT_DIR, 'test.png');
    const outputPath = join(OUTPUT_DIR, 'test_bgreplaced.png');
    const { stdout } = await exec('node', [
      CLI, 'bg-replace', inputPath, '#00ff00',
      '-o', outputPath,
    ]);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('crop command works', async () => {
    const inputPath = join(INPUT_DIR, 'test.png');
    const outputPath = join(OUTPUT_DIR, 'test_cropped.png');
    const { stdout } = await exec('node', [
      CLI, 'crop', inputPath,
      '-o', outputPath,
      '-W', '100',
      '-H', '100',
    ]);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('crop with trim works', async () => {
    const inputPath = join(INPUT_DIR, 'test.png');
    const outputPath = join(OUTPUT_DIR, 'test_trimmed.png');
    const { stdout } = await exec('node', [
      CLI, 'crop', inputPath,
      '-o', outputPath,
      '--trim',
    ]);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('batch bg-remove works', async () => {
    const batchOutput = join(TEST_DIR, 'batch_output');
    const { stdout, stderr } = await exec('node', [
      CLI, 'batch', 'bg-remove', INPUT_DIR,
      '-o', batchOutput,
    ], { timeout: 30000 });
    const output = stdout + stderr;
    expect(output).toContain('Batch complete');
  });

  it('shows error for missing input', async () => {
    try {
      await exec('node', [CLI, 'bg-remove', '/nonexistent/image.png']);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.code).not.toBe(0);
    }
  });

  it('shows error for invalid operation in batch', async () => {
    try {
      await exec('node', [CLI, 'batch', 'invalid-op', INPUT_DIR]);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.code).not.toBe(0);
    }
  });
});

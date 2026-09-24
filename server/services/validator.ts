import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ValidationRun } from '../db/types.js';

export interface ValidationStepResult {
  step: 'lint' | 'typecheck' | 'test' | 'final_check';
  command: string;
  exitCode: number;
  passed: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ValidationSuiteResult {
  passed: boolean;
  steps: ValidationStepResult[];
  rawErrorOutput: string;
}

export class Validator {
  private static readonly TIMEOUT_MS = 45000;
  private static readonly MAX_OUTPUT_BYTES = 60 * 1024; // 60KB

  /**
   * Run a single command with timeout and output size limits
   */
  private static runCommand(cmd: string, cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = exec(cmd, {
        cwd,
        timeout: this.TIMEOUT_MS,
        maxBuffer: this.MAX_OUTPUT_BYTES,
        env: {
          ...process.env,
          CI: 'true',
          NODE_ENV: 'test',
        },
      }, (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        let exitCode = 0;
        if (error) {
          exitCode = error.code ?? 1;
        }

        const cleanStdout = (stdout || '').slice(0, this.MAX_OUTPUT_BYTES);
        const cleanStderr = (stderr || (error ? error.message : '')).slice(0, this.MAX_OUTPUT_BYTES);

        resolve({
          exitCode,
          stdout: cleanStdout,
          stderr: cleanStderr,
          durationMs,
        });
      });
    });
  }

  /**
   * Run validation suite for a workspace based on detected scripts/configs
   */
  static async validateWorkspace(workspacePath: string): Promise<ValidationSuiteResult> {
    const pkgPath = path.join(workspacePath, 'package.json');
    const tsconfigPath = path.join(workspacePath, 'tsconfig.json');

    let scripts: Record<string, string> = {};
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        scripts = pkg.scripts || {};
      } catch (e) {}
    }

    const stepsToRun: Array<{ step: 'lint' | 'typecheck' | 'test'; command: string }> = [];

    // Lint
    if (scripts['lint']) {
      stepsToRun.push({ step: 'lint', command: 'npm run lint' });
    }

    // Typecheck
    if (scripts['typecheck']) {
      stepsToRun.push({ step: 'typecheck', command: 'npm run typecheck' });
    } else if (fs.existsSync(tsconfigPath)) {
      stepsToRun.push({ step: 'typecheck', command: 'npx tsc --noEmit' });
    }

    // Test
    if (scripts['test'] && scripts['test'] !== 'echo "Error: no test specified" && exit 1') {
      stepsToRun.push({ step: 'test', command: 'npm test' });
    }

    // If no commands detected at all, run basic syntax check on TypeScript/JavaScript files
    if (stepsToRun.length === 0 && fs.existsSync(tsconfigPath)) {
      stepsToRun.push({ step: 'typecheck', command: 'npx tsc --noEmit' });
    }

    const stepResults: ValidationStepResult[] = [];
    let allPassed = true;
    const failureOutputs: string[] = [];

    for (const item of stepsToRun) {
      const res = await this.runCommand(item.command, workspacePath);
      const passed = res.exitCode === 0;

      stepResults.push({
        step: item.step,
        command: item.command,
        exitCode: res.exitCode,
        passed,
        stdout: res.stdout,
        stderr: res.stderr,
        durationMs: res.durationMs,
      });

      if (!passed) {
        allPassed = false;
        failureOutputs.push(
          `[FAIL] ${item.step.toUpperCase()} Command: '${item.command}' (Exit code: ${res.exitCode})\n` +
          `STDOUT:\n${res.stdout}\n` +
          `STDERR:\n${res.stderr}`
        );
        // Fail fast: do not proceed to test if compilation/typecheck fails
        break;
      }
    }

    return {
      passed: allPassed,
      steps: stepResults,
      rawErrorOutput: failureOutputs.join('\n\n---\n\n'),
    };
  }
}

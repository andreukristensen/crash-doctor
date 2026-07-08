import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { CAPTURE_COMMANDS_KB } from "../prompt/knowledgeBase.js";
import { isCaptureCommandId } from "../tools/captureTool.js";

const execFilePromise = promisify(execFileCallback);

export interface CaptureResult {
  ok: boolean;
  output: string;
}

export type ExecFileFn = (
  file: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

const defaultExecFile: ExecFileFn = (file, args) =>
  execFilePromise(file, args, { timeout: 15_000, maxBuffer: 1024 * 1024 });

/**
 * The only path from a model-chosen id to an actual process launch. `commandId`
 * is validated against the whitelist before it ever reaches execFile, and the
 * argv passed to powershell.exe is a fixed array from knowledgeBase.ts - never
 * a string built by concatenating model output.
 */
export async function executeCaptureCommand(
  commandId: string,
  execFn: ExecFileFn = defaultExecFile,
): Promise<CaptureResult> {
  if (!isCaptureCommandId(commandId)) {
    return { ok: false, output: `Unknown capture command id: ${commandId}` };
  }

  const spec = CAPTURE_COMMANDS_KB[commandId];

  try {
    const { stdout, stderr } = await execFn("powershell.exe", spec.args);
    const output = stdout.trim() || stderr.trim() || "(no output)";
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, output: `Command failed: ${message}` };
  }
}

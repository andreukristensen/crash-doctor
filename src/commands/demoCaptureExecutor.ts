import { isCaptureCommandId } from "../tools/captureTool.js";
import type { CaptureResult } from "./captureExecutor.js";
import { DEMO_CAPTURE_OUTPUT } from "./demoFixtures.js";

/**
 * Drop-in replacement for executeCaptureCommand that never touches
 * PowerShell or the real event log - it returns the same canned scenario
 * regardless of machine, so --demo works on any PC (or non-Windows OS)
 * with no crash history of its own.
 */
export async function executeDemoCaptureCommand(commandId: string): Promise<CaptureResult> {
  if (!isCaptureCommandId(commandId)) {
    return { ok: false, output: `Unknown capture command id: ${commandId}` };
  }

  return { ok: true, output: DEMO_CAPTURE_OUTPUT[commandId] };
}

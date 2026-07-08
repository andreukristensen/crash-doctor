export const CAPTURE_COMMANDS = [
  "recent_bugcheck_events",
  "whea_hardware_events",
  "list_minidumps",
  "stopcode_wer_events",
] as const;

export type CaptureCommandId = (typeof CAPTURE_COMMANDS)[number];

export function isCaptureCommandId(value: string): value is CaptureCommandId {
  return (CAPTURE_COMMANDS as readonly string[]).includes(value);
}

export const runCaptureCommandTool = {
  name: "run_capture_command",
  description:
    "Run one whitelisted, read-only PowerShell CAPTURE command to gather " +
    "Windows crash evidence (event log queries, minidump listing). This is " +
    "the ONLY command-execution tool available. It cannot run arbitrary " +
    "commands, only the four enumerated diagnostic queries.",
  input_schema: {
    type: "object" as const,
    properties: {
      command_id: {
        type: "string",
        enum: CAPTURE_COMMANDS as unknown as string[],
        description: "Which whitelisted capture command to run.",
      },
    },
    required: ["command_id"],
    additionalProperties: false,
  },
};

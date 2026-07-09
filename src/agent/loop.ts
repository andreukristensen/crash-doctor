import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { executeCaptureCommand, type CaptureResult } from "../commands/captureExecutor.js";
import type { Ledger } from "../ledger/ledger.js";
import type { LedgerStatus } from "../ledger/types.js";
import { buildSystemPrompt } from "../prompt/systemPrompt.js";
import { runCaptureCommandTool } from "../tools/captureTool.js";
import { updateLedgerTool } from "../tools/ledgerTool.js";

export interface RunTurnOptions {
  model: string;
  maxTokens?: number;
  /** Defaults to the real whitelist-only PowerShell executor; --demo mode injects a canned-data version. */
  captureFn?: (commandId: string) => Promise<CaptureResult>;
}

export interface TurnCallbacks {
  onAssistantText: (text: string) => void;
  onCaptureCommand: (commandId: string) => void;
  onLedgerUpdate: (ledger: Ledger) => void;
}

interface UpdateLedgerInput {
  suspect: string;
  status: LedgerStatus;
  evidence: string;
  test_used: string;
}

/**
 * Manual tool-use loop rather than the SDK's built-in tool runner: every
 * tool call is intercepted here so run_capture_command can be logged and
 * executed through the whitelist-only executor, and update_ledger can
 * mutate deterministic state instead of being parsed out of prose.
 */
export async function runTurn(
  client: Anthropic,
  history: MessageParam[],
  ledger: Ledger,
  options: RunTurnOptions,
  callbacks: TurnCallbacks,
): Promise<MessageParam[]> {
  let messages = history;
  const captureFn = options.captureFn ?? executeCaptureCommand;

  while (true) {
    const response = await client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: buildSystemPrompt(ledger),
      tools: [runCaptureCommandTool, updateLedgerTool],
      messages,
    });

    messages = [...messages, { role: "assistant", content: response.content }];

    for (const block of response.content) {
      if (block.type === "text") callbacks.onAssistantText(block.text);
    }

    if (response.stop_reason !== "tool_use") {
      return messages;
    }

    const toolResults: ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "run_capture_command") {
        const input = block.input as { command_id: string };
        callbacks.onCaptureCommand(input.command_id);
        const result = await captureFn(input.command_id);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.output,
          is_error: !result.ok,
        });
      } else if (block.name === "update_ledger") {
        const input = block.input as UpdateLedgerInput;
        ledger.upsert({
          suspect: input.suspect,
          status: input.status,
          evidence: input.evidence,
          testUsed: input.test_used,
        });
        callbacks.onLedgerUpdate(ledger);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "ledger updated",
        });
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Unknown tool: ${block.name}`,
          is_error: true,
        });
      }
    }

    messages = [...messages, { role: "user", content: toolResults }];
  }
}

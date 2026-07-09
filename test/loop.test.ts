import assert from "node:assert/strict";
import { test } from "node:test";
import { runTurn } from "../src/agent/loop.js";
import { Ledger } from "../src/ledger/ledger.js";

function fakeClient(responses: unknown[]) {
  let call = 0;
  return {
    messages: {
      create: async () => responses[call++],
    },
  } as any;
}

test("runTurn calls the injected captureFn instead of the real executor", async () => {
  const toolUseResponse = {
    content: [
      {
        type: "tool_use",
        id: "toolu_1",
        name: "run_capture_command",
        input: { command_id: "list_minidumps" },
      },
    ],
    stop_reason: "tool_use",
  };
  const finalResponse = {
    content: [{ type: "text", text: "done" }],
    stop_reason: "end_turn",
  };

  const client = fakeClient([toolUseResponse, finalResponse]);
  const ledger = new Ledger();
  const capturedIds: string[] = [];

  const captureFn = async (commandId: string) => {
    capturedIds.push(commandId);
    return { ok: true, output: "fake output, never touched powershell" };
  };

  const notifiedIds: string[] = [];

  await runTurn(
    client,
    [{ role: "user", content: "hi" }],
    ledger,
    { model: "claude-sonnet-5", captureFn },
    {
      onAssistantText: () => {},
      onCaptureCommand: (id) => notifiedIds.push(id),
      onLedgerUpdate: () => {},
    },
  );

  assert.deepEqual(capturedIds, ["list_minidumps"]);
  assert.deepEqual(notifiedIds, ["list_minidumps"]);
});

test("runTurn mutates the ledger via update_ledger tool calls", async () => {
  const toolUseResponse = {
    content: [
      {
        type: "tool_use",
        id: "toolu_2",
        name: "update_ledger",
        input: {
          suspect: "GPU driver",
          status: "open",
          evidence: "one dump",
          test_used: "",
        },
      },
    ],
    stop_reason: "tool_use",
  };
  const finalResponse = {
    content: [{ type: "text", text: "done" }],
    stop_reason: "end_turn",
  };

  const client = fakeClient([toolUseResponse, finalResponse]);
  const ledger = new Ledger();

  await runTurn(
    client,
    [{ role: "user", content: "hi" }],
    ledger,
    { model: "claude-sonnet-5" },
    { onAssistantText: () => {}, onCaptureCommand: () => {}, onLedgerUpdate: () => {} },
  );

  assert.deepEqual(ledger.getRows(), [
    { suspect: "GPU driver", status: "open", evidence: "one dump", testUsed: "" },
  ]);
});

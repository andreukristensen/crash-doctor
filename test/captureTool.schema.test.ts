import assert from "node:assert/strict";
import { test } from "node:test";
import { CAPTURE_COMMANDS, runCaptureCommandTool } from "../src/tools/captureTool.js";
import { CAPTURE_COMMANDS_KB } from "../src/prompt/knowledgeBase.js";
import { LEDGER_STATUSES, updateLedgerTool } from "../src/tools/ledgerTool.js";

test("run_capture_command enum matches the CAPTURE_COMMANDS whitelist exactly", () => {
  const schemaEnum = (runCaptureCommandTool.input_schema.properties.command_id as { enum: string[] }).enum;
  assert.deepEqual([...schemaEnum].sort(), [...CAPTURE_COMMANDS].sort());
});

test("run_capture_command schema rejects unknown properties", () => {
  assert.equal(runCaptureCommandTool.input_schema.additionalProperties, false);
  assert.deepEqual(runCaptureCommandTool.input_schema.required, ["command_id"]);
});

test("the tool schema and the knowledge base never drift apart", () => {
  assert.deepEqual(Object.keys(CAPTURE_COMMANDS_KB).sort(), [...CAPTURE_COMMANDS].sort());
});

test("update_ledger schema requires all four ledger fields", () => {
  assert.equal(updateLedgerTool.input_schema.additionalProperties, false);
  assert.deepEqual(
    [...updateLedgerTool.input_schema.required].sort(),
    ["evidence", "status", "suspect", "test_used"].sort(),
  );
});

test("update_ledger status enum matches LEDGER_STATUSES", () => {
  const schemaEnum = (updateLedgerTool.input_schema.properties.status as { enum: string[] }).enum;
  assert.deepEqual([...schemaEnum].sort(), [...LEDGER_STATUSES].sort());
});

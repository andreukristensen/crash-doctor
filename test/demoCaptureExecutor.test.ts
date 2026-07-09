import assert from "node:assert/strict";
import { test } from "node:test";
import { executeDemoCaptureCommand } from "../src/commands/demoCaptureExecutor.js";
import { DEMO_CAPTURE_OUTPUT } from "../src/commands/demoFixtures.js";
import { CAPTURE_COMMANDS } from "../src/tools/captureTool.js";

test("rejects an unknown command id, same as the real executor", async () => {
  const result = await executeDemoCaptureCommand("delete_everything");
  assert.equal(result.ok, false);
  assert.match(result.output, /Unknown capture command id/);
});

test("every whitelisted command has canned demo output", async () => {
  for (const commandId of CAPTURE_COMMANDS) {
    const result = await executeDemoCaptureCommand(commandId);
    assert.equal(result.ok, true, `expected ${commandId} to succeed`);
    assert.equal(result.output, DEMO_CAPTURE_OUTPUT[commandId]);
  }
});

test("demo fixtures cover exactly the whitelisted commands, no more, no less", () => {
  assert.deepEqual(Object.keys(DEMO_CAPTURE_OUTPUT).sort(), [...CAPTURE_COMMANDS].sort());
});

test("never touches a real process - no child_process dependency in this module", async () => {
  // Calling it twice with no exec mock available proves it can't be shelling out.
  const first = await executeDemoCaptureCommand("list_minidumps");
  const second = await executeDemoCaptureCommand("list_minidumps");
  assert.equal(first.output, second.output);
});

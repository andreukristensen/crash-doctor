import assert from "node:assert/strict";
import { test } from "node:test";
import { executeCaptureCommand } from "../src/commands/captureExecutor.js";
import { CAPTURE_COMMANDS } from "../src/tools/captureTool.js";

test("rejects an unknown command id before ever reaching execFile", async () => {
  let called = false;
  const result = await executeCaptureCommand("delete_everything", async () => {
    called = true;
    return { stdout: "", stderr: "" };
  });

  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.match(result.output, /Unknown capture command id/);
});

test("runs powershell.exe with a fixed argv for a whitelisted command", async () => {
  let capturedFile = "";
  let capturedArgs: string[] = [];

  const result = await executeCaptureCommand("list_minidumps", async (file, args) => {
    capturedFile = file;
    capturedArgs = args;
    return { stdout: "Minidump listing\n", stderr: "" };
  });

  assert.equal(result.ok, true);
  assert.equal(result.output, "Minidump listing");
  assert.equal(capturedFile, "powershell.exe");
  assert.ok(capturedArgs.every((arg) => typeof arg === "string"));
  assert.ok(capturedArgs.some((arg) => arg.includes("Get-ChildItem")));
});

test("surfaces exec failures as a non-ok result instead of throwing", async () => {
  const result = await executeCaptureCommand("recent_bugcheck_events", async () => {
    throw new Error("access denied");
  });

  assert.equal(result.ok, false);
  assert.match(result.output, /access denied/);
});

test("every whitelisted command id can be executed without special-casing", async () => {
  for (const commandId of CAPTURE_COMMANDS) {
    const result = await executeCaptureCommand(commandId, async () => ({ stdout: "ok", stderr: "" }));
    assert.equal(result.ok, true, `expected ${commandId} to succeed`);
  }
});

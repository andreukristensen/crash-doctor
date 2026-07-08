import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createSession, loadSession, saveSession } from "../src/session/sessionStore.js";

async function tempSessionPath(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "crash-doctor-test-"));
  return path.join(dir, "session.json");
}

test("loadSession returns null when no session file exists", async () => {
  const filePath = await tempSessionPath();
  const session = await loadSession(filePath);
  assert.equal(session, null);
});

test("saveSession then loadSession round-trips the session contents", async () => {
  const filePath = await tempSessionPath();
  const session = createSession();
  session.ledger.push({ suspect: "GPU driver", status: "open", evidence: "one dump", testUsed: "" });

  await saveSession(filePath, session);
  const loaded = await loadSession(filePath);

  assert.deepEqual(loaded, session);
});

test("saveSession creates the parent directory if it doesn't exist yet", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "crash-doctor-test-"));
  const filePath = path.join(dir, "nested", ".crash-doctor", "session.json");

  await saveSession(filePath, createSession());
  const stat = await fs.stat(filePath);

  assert.ok(stat.isFile());
});

test("saveSession leaves no leftover temp file after a successful write", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "crash-doctor-test-"));
  const filePath = path.join(dir, "session.json");

  await saveSession(filePath, createSession());
  const entries = await fs.readdir(dir);

  assert.deepEqual(entries, ["session.json"]);
});

test("a second save overwrites the first atomically (final content is the last write)", async () => {
  const filePath = await tempSessionPath();
  const first = createSession();
  const second = { ...createSession(), createdAt: "2020-01-01T00:00:00.000Z" };

  await saveSession(filePath, first);
  await saveSession(filePath, second);
  const loaded = await loadSession(filePath);

  assert.equal(loaded?.createdAt, "2020-01-01T00:00:00.000Z");
});

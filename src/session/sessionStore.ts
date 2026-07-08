import { promises as fs } from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import type { LedgerRow } from "../ledger/types.js";

export interface SessionFile {
  version: 1;
  createdAt: string;
  updatedAt: string;
  ledger: LedgerRow[];
  transcript: Anthropic.MessageParam[];
}

const SESSION_DIR = ".crash-doctor";
const SESSION_FILE = "session.json";

export function sessionFilePath(cwd: string = process.cwd()): string {
  return path.join(cwd, SESSION_DIR, SESSION_FILE);
}

export function createSession(): SessionFile {
  const now = new Date().toISOString();
  return { version: 1, createdAt: now, updatedAt: now, ledger: [], transcript: [] };
}

export async function loadSession(filePath: string): Promise<SessionFile | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as SessionFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Atomic write: build the full file in a temp path, then rename over the
 * real one. A crash mid-write leaves the old session file intact rather
 * than a truncated/corrupt one.
 */
export async function saveSession(filePath: string, session: SessionFile): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = path.join(dir, `.session.json.tmp-${process.pid}`);
  await fs.writeFile(tmpPath, JSON.stringify(session, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

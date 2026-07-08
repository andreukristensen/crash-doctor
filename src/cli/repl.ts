import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import type Anthropic from "@anthropic-ai/sdk";
import { runTurn } from "../agent/loop.js";
import { Ledger } from "../ledger/ledger.js";
import {
  createSession,
  loadSession,
  saveSession,
  sessionFilePath,
  type SessionFile,
} from "../session/sessionStore.js";
import { renderAssistantText, renderCaptureCommandStart, renderLedgerUpdate } from "./render.js";

export interface ReplOptions {
  model: string;
  resume: boolean;
}

export async function startRepl(client: Anthropic, options: ReplOptions): Promise<void> {
  const filePath = sessionFilePath();
  const loaded = options.resume ? await loadSession(filePath) : null;
  const session: SessionFile = loaded ?? createSession();

  if (loaded) {
    console.log(`Resumed session from ${filePath} (started ${loaded.createdAt}).`);
  } else {
    console.log(
      "Starting a new crash-triage session. Describe what's happening " +
        "(symptom, frequency, load vs idle, timestamps). Type /exit to quit.",
    );
  }

  const ledger = Ledger.fromRows(session.ledger);
  if (!ledger.isEmpty()) {
    renderLedgerUpdate(ledger.toMarkdownTable());
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    while (true) {
      let userInput: string;
      try {
        userInput = await rl.question("\n> ");
      } catch (error) {
        // stdin closed (piped input ended, or Ctrl+D/Ctrl+Z) - end the
        // session gracefully instead of throwing ERR_USE_AFTER_CLOSE.
        if ((error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE") break;
        throw error;
      }

      const trimmed = userInput.trim();
      if (!trimmed) continue;
      if (trimmed === "/exit" || trimmed === "/quit") break;

      const history = [...session.transcript, { role: "user" as const, content: trimmed }];

      const updatedHistory = await runTurn(
        client,
        history,
        ledger,
        { model: options.model },
        {
          onAssistantText: renderAssistantText,
          onCaptureCommand: renderCaptureCommandStart,
          onLedgerUpdate: (l) => renderLedgerUpdate(l.toMarkdownTable()),
        },
      );

      session.transcript = updatedHistory;
      session.ledger = ledger.getRows();
      session.updatedAt = new Date().toISOString();
      await saveSession(filePath, session);
    }
  } finally {
    rl.close();
  }

  console.log(`\nSession saved to ${filePath}. Run with --resume to continue.`);
}

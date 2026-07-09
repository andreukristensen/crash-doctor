import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import type Anthropic from "@anthropic-ai/sdk";
import { runTurn } from "../agent/loop.js";
import { CrashDoctorApiError } from "../agent/retry.js";
import { executeDemoCaptureCommand } from "../commands/demoCaptureExecutor.js";
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
  /** Use canned example event-log data instead of the real machine's logs, and don't persist the session. */
  demo: boolean;
}

export async function startRepl(client: Anthropic, options: ReplOptions): Promise<void> {
  const filePath = sessionFilePath();
  const loaded = options.demo ? null : options.resume ? await loadSession(filePath) : null;
  const session: SessionFile = loaded ?? createSession();

  if (options.demo) {
    console.log(
      "Demo mode: CAPTURE commands return a canned example scenario instead of " +
        "this machine's real logs, so you can try the full loop without a crash " +
        "history of your own. Nothing is written to disk in this mode. Type /exit to quit.",
    );
  } else if (loaded) {
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

      try {
        const updatedHistory = await runTurn(
          client,
          history,
          ledger,
          {
            model: options.model,
            captureFn: options.demo ? executeDemoCaptureCommand : undefined,
          },
          {
            onAssistantText: renderAssistantText,
            onCaptureCommand: renderCaptureCommandStart,
            onLedgerUpdate: (l) => renderLedgerUpdate(l.toMarkdownTable()),
            onApiRetry: (attempt, maxAttempts, delayMs, error) => {
              const reason = error instanceof Error ? error.message : String(error);
              console.log(
                `\n(${reason} - retrying in ${Math.round(delayMs / 1000)}s, ` +
                  `attempt ${attempt}/${maxAttempts - 1})`,
              );
            },
          },
        );

        session.transcript = updatedHistory;
        session.ledger = ledger.getRows();
        session.updatedAt = new Date().toISOString();
        if (!options.demo) await saveSession(filePath, session);
      } catch (error) {
        if (!(error instanceof CrashDoctorApiError)) throw error;
        // The user's message never made it into transcript/ledger state, so
        // nothing is inconsistent to roll back - just report and re-prompt.
        console.error(`\n${error.message}\n`);
      }
    }
  } finally {
    rl.close();
  }

  if (!options.demo) {
    console.log(`\nSession saved to ${filePath}. Run with --resume to continue.`);
  }
}

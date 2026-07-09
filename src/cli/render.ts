import { stdout } from "node:process";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

/**
 * Heuristic: a line ending in "?" is treated as a question aimed at the
 * user (the TEST-phase question, a clarifying ask, etc.) and gets colored
 * so it stands out from the surrounding narration. Pure and always-on, so
 * it's testable independent of TTY detection - useColor() gates it at the
 * call site instead.
 */
export function highlightQuestionLines(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim().endsWith("?") ? `${YELLOW}${line}${RESET}` : line))
    .join("\n");
}

function useColor(): boolean {
  return Boolean(stdout.isTTY) && !process.env.NO_COLOR;
}

export function renderAssistantText(text: string): void {
  const body = useColor() ? highlightQuestionLines(text) : text;
  console.log(`\n${body}\n`);
}

export function renderCaptureCommandStart(commandId: string): void {
  console.log(`  -> running capture command: ${commandId}`);
}

export function renderLedgerUpdate(markdownTable: string): void {
  console.log("\n--- Evidence ledger ---");
  console.log(markdownTable);
  console.log("------------------------\n");
}

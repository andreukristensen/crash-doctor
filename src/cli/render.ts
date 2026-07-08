export function renderAssistantText(text: string): void {
  console.log(`\n${text}\n`);
}

export function renderCaptureCommandStart(commandId: string): void {
  console.log(`  -> running capture command: ${commandId}`);
}

export function renderLedgerUpdate(markdownTable: string): void {
  console.log("\n--- Evidence ledger ---");
  console.log(markdownTable);
  console.log("------------------------\n");
}

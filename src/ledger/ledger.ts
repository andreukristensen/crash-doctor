import type { LedgerRow, LedgerStatus } from "./types.js";

const STATUS_LABEL: Record<LedgerStatus, string> = {
  open: "Open",
  ruled_out: "Ruled out",
  confirmed: "Confirmed",
};

export class Ledger {
  private rows = new Map<string, LedgerRow>();

  upsert(row: LedgerRow): void {
    this.rows.set(row.suspect, row);
  }

  getRows(): LedgerRow[] {
    return [...this.rows.values()];
  }

  isEmpty(): boolean {
    return this.rows.size === 0;
  }

  toMarkdownTable(): string {
    if (this.isEmpty()) {
      return "_No suspects tracked yet._";
    }

    const header = "| Suspect | Status | Evidence | Test used |";
    const divider = "|---|---|---|---|";
    const body = this.getRows().map(
      (row) =>
        `| ${row.suspect} | ${STATUS_LABEL[row.status]} | ${row.evidence} | ${row.testUsed || "-"} |`,
    );

    return [header, divider, ...body].join("\n");
  }

  toJSON(): LedgerRow[] {
    return this.getRows();
  }

  static fromRows(rows: LedgerRow[]): Ledger {
    const ledger = new Ledger();
    for (const row of rows) ledger.upsert(row);
    return ledger;
  }
}

export type LedgerStatus = "open" | "ruled_out" | "confirmed";

export interface LedgerRow {
  suspect: string;
  status: LedgerStatus;
  evidence: string;
  testUsed: string;
}

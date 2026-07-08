export const LEDGER_STATUSES = ["open", "ruled_out", "confirmed"] as const;

export const updateLedgerTool = {
  name: "update_ledger",
  description:
    "Add or update one row of the evidence ledger. Call this every time a " +
    "suspect's status changes, per the loop's UPDATE phase. Always re-state " +
    "the full row, not a partial patch.",
  input_schema: {
    type: "object" as const,
    properties: {
      suspect: {
        type: "string",
        description: "Short name of the candidate root cause.",
      },
      status: {
        type: "string",
        enum: LEDGER_STATUSES as unknown as string[],
      },
      evidence: {
        type: "string",
        description: "What evidence supports this status.",
      },
      test_used: {
        type: "string",
        description: "Which test/command produced this evidence, if any.",
      },
    },
    required: ["suspect", "status", "evidence", "test_used"],
    additionalProperties: false,
  },
};

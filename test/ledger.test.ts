import assert from "node:assert/strict";
import { test } from "node:test";
import { Ledger } from "../src/ledger/ledger.js";

test("empty ledger renders a placeholder", () => {
  const ledger = new Ledger();
  assert.equal(ledger.isEmpty(), true);
  assert.match(ledger.toMarkdownTable(), /No suspects tracked yet/);
});

test("upsert adds a new suspect row", () => {
  const ledger = new Ledger();
  ledger.upsert({ suspect: "GPU driver", status: "open", evidence: "single dump", testUsed: "" });

  assert.equal(ledger.isEmpty(), false);
  assert.deepEqual(ledger.getRows(), [
    { suspect: "GPU driver", status: "open", evidence: "single dump", testUsed: "" },
  ]);
});

test("upsert overwrites the existing row for the same suspect instead of duplicating it", () => {
  const ledger = new Ledger();
  ledger.upsert({ suspect: "GPU driver", status: "open", evidence: "single dump", testUsed: "" });
  ledger.upsert({
    suspect: "GPU driver",
    status: "ruled_out",
    evidence: "driver reinstalled, crash recurred",
    testUsed: "driver reinstall",
  });

  const rows = ledger.getRows();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "ruled_out");
});

test("toMarkdownTable renders one row per suspect with status labels", () => {
  const ledger = new Ledger();
  ledger.upsert({ suspect: "RAM", status: "confirmed", evidence: "MemTest86 failed", testUsed: "MemTest86" });

  const table = ledger.toMarkdownTable();
  assert.match(table, /\| RAM \| Confirmed \| MemTest86 failed \| MemTest86 \|/);
});

test("fromRows reconstructs an equivalent ledger", () => {
  const rows = [
    { suspect: "XMP", status: "ruled_out" as const, evidence: "disabled, crash recurred", testUsed: "disable XMP" },
  ];
  const ledger = Ledger.fromRows(rows);
  assert.deepEqual(ledger.getRows(), rows);
});

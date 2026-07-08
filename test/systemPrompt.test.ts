import assert from "node:assert/strict";
import { test } from "node:test";
import { Ledger } from "../src/ledger/ledger.js";
import { buildSystemPrompt } from "../src/prompt/systemPrompt.js";

test("system prompt has a cached static block and an uncached ledger block", () => {
  const ledger = new Ledger();
  const blocks = buildSystemPrompt(ledger);

  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0].cache_control, { type: "ephemeral" });
  assert.equal(blocks[1].cache_control, undefined);
});

test("static block contains the knowledge base tables regardless of ledger state", () => {
  const ledger = new Ledger();
  const [staticBlock] = buildSystemPrompt(ledger);

  assert.match(staticBlock.text, /0x124/);
  assert.match(staticBlock.text, /WHEA_UNCORRECTABLE_ERROR/);
  assert.match(staticBlock.text, /Vmin Shift/);
});

test("ledger block reflects the current ledger contents", () => {
  const ledger = new Ledger();
  ledger.upsert({ suspect: "GPU driver", status: "open", evidence: "one dump", testUsed: "" });

  const [, ledgerBlock] = buildSystemPrompt(ledger);
  assert.match(ledgerBlock.text, /GPU driver/);
});

test("the static block is byte-identical across different ledger states, so it stays cacheable", () => {
  const emptyLedger = new Ledger();
  const fullLedger = new Ledger();
  fullLedger.upsert({ suspect: "RAM", status: "confirmed", evidence: "MemTest86 failed", testUsed: "MemTest86" });

  const [staticA] = buildSystemPrompt(emptyLedger);
  const [staticB] = buildSystemPrompt(fullLedger);

  assert.equal(staticA.text, staticB.text);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { highlightQuestionLines } from "../src/cli/render.js";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

test("wraps a line ending in a question mark", () => {
  const result = highlightQuestionLines("Does the PC reboot on its own?");
  assert.equal(result, `${YELLOW}Does the PC reboot on its own?${RESET}`);
});

test("leaves narration lines uncolored", () => {
  const result = highlightQuestionLines("That's a hardware-reported error.");
  assert.equal(result, "That's a hardware-reported error.");
});

test("colors only the question lines in a multi-line response", () => {
  const text = [
    "CAPTURE results came back empty.",
    "",
    "Does the PC reboot on its own, or just hang until a hard reset?",
    "That single answer splits the leading hypotheses.",
  ].join("\n");

  const result = highlightQuestionLines(text);
  const lines = result.split("\n");

  assert.equal(lines[0], "CAPTURE results came back empty.");
  assert.equal(lines[1], "");
  assert.equal(lines[2], `${YELLOW}Does the PC reboot on its own, or just hang until a hard reset?${RESET}`);
  assert.equal(lines[3], "That single answer splits the leading hypotheses.");
});

test("trims trailing whitespace before checking for a question mark", () => {
  const result = highlightQuestionLines("Is this a question?   ");
  assert.equal(result, `${YELLOW}Is this a question?   ${RESET}`);
});

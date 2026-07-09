#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { createClient, DEFAULT_MODEL } from "./agent/client.js";
import { startRepl } from "./cli/repl.js";

const program = new Command();

program
  .name("crash-doctor")
  .description("AI-assisted Windows crash triage CLI")
  .option("-r, --resume", "resume the last session in .crash-doctor/session.json", false)
  .option("-m, --model <model>", "Claude model to use", DEFAULT_MODEL)
  .option(
    "-d, --demo",
    "use a canned example scenario instead of this machine's real logs - try the " +
      "full loop with no crash history and nothing written to disk",
    false,
  )
  .parse(process.argv);

const options = program.opts<{ resume: boolean; model: string; demo: boolean }>();

const client = createClient();
await startRepl(client, { model: options.model, resume: options.resume, demo: options.demo });

> **Archived.** This folder is the original Claude Code project concept that
> [`crash-doctor`](../../README.md) was rebuilt from as a standalone CLI. Kept
> here for the origin story, not for use — see the root README instead.

# Windows Crash-Diagnosis Assistant — Setup

A Claude Code project that guides you through systematic Windows crash
triage using the CAPTURE → DECODE → HYPOTHESISE → TEST → UPDATE → RESOLVE
loop, maintaining a live evidence ledger until a root cause is confirmed.

## Structure

```
diag-tool/
├── CLAUDE.md              # the method: loop, hard rules, ledger format
├── windows-crash-kb.md    # domain knowledge: commands, stop codes, causes
└── .claude/
    └── settings.json      # permission whitelist (read-only capture only)
```

## What it can do on its own

Only the commands whitelisted in `.claude/settings.json`:
- `Get-WinEvent` queries (crash/bugcheck events, WHEA hardware events)
- `Get-ChildItem` on `C:\Windows\Minidump`

Everything else — WinDbg analysis, driver updates, BIOS/setting changes,
MemTest86, any fix — it will hand you as a command to run yourself, or
Claude Code will prompt you to approve before running. Treat that prompt as
a real gate, not a formality.

## Setup

1. Install [Claude Code](https://docs.claude.com/en/docs/claude-code) if
   you haven't already.
2. Put this folder somewhere on the Windows machine you're diagnosing (or a
   machine with remote access to it).
3. Open a terminal in `diag-tool/` and run `claude`.
4. Start with something like: *"My PC has been crashing randomly, black
   screen, a few times over the last two weeks."* — it should kick off
   CAPTURE automatically using the whitelisted commands.

## Extending later

- **More capture commands**: add them to `.claude/settings.json` under
  `allow`, and document them in `windows-crash-kb.md` under CAPTURE.
- **More domains** (Linux panics, app crashes, network faults): add a new
  `<domain>-kb.md` file with the same CAPTURE/DECODE/TEST structure, and
  extend `CLAUDE.md` to say which KB file to use based on the OS/context —
  this is the "plugin" seam the original method doc calls out.
- **Higher autonomy later**: if you decide to let it run reversible TEST
  commands too (driver updates, XMP toggle), add them to `allow` and update
  the autonomy boundary paragraph in `CLAUDE.md` — the ledger and loop logic
  don't need to change at all.
- **Handoff templates**: at RESOLVE, ask it to format the ledger as a
  ticket/RMA/postmortem — currently freeform; a fixed template can be added
  as a fourth file (e.g. `handoff-template.md`) once you know the shape you
  want.

## Validating it works

Before using it for real, try walking it through the original worked case
from `diagnostic-method-and-case.md` (paste the CAPTURE outputs from
section 5 turn by turn) and check that it: recommends one test at a time,
updates the ledger each turn, flags the AV-signature red herring correctly,
and reaches the CPU/Vmin-shift conclusion via the same elimination path.

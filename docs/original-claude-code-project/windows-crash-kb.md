# Windows Crash-Triage Knowledge Base

Reference material for the diagnostic assistant. This is the "domain plugin"
for Windows bugchecks — the decode lookup, the symptom→cause map, and the
cost-ordered test list.

---

## CAPTURE — commands (auto-run, whitelisted)

```powershell
# Recent unexpected-shutdown / bugcheck events
Get-WinEvent -FilterHashtable @{LogName='System'; Id=41,1001,6008} -MaxEvents 15 |
  Format-Table TimeCreated, Id, ProviderName -AutoSize

# Hardware error events (present => raw hardware fault more likely)
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WHEA-Logger'} -MaxEvents 15 -ErrorAction SilentlyContinue

# Do crash dumps exist?
Get-ChildItem C:\Windows\Minidump\ | Sort-Object LastWriteTime -Descending

# Stop code + parameters for each crash
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WER-SystemErrorReporting'; Id=1001} -MaxEvents 5 |
  Format-List TimeCreated, Message
```

**Environment gotchas:**
- `C:\Windows\Minidump` requires an **elevated** process, not just an admin
  account — if the listing comes back empty/denied, check elevation before
  concluding there are no dumps.
- RDP hides a headless GPU from device queries — check hardware locally
  before concluding a card is missing.
- WinDbg may label build 26100 as "Windows 10"; it's Windows 11 24H2.

## DECODE — user-run (not whitelisted)

```
# In WinDbg (winget install Microsoft.WinDbg), per dump:
.symfix
.reload
!analyze -v
# Read: BUGCHECK_CODE, FAILURE_BUCKET_ID, MODULE_NAME, PROCESS_NAME, STACK_TEXT
```

### Stop-code cheat sheet

| Code | Name | Meaning |
|---|---|---|
| `0x50` | PAGE_FAULT_IN_NONPAGED_AREA | Referenced invalid/freed memory |
| `0x3B` | SYSTEM_SERVICE_EXCEPTION | Often `0xc0000005` = access violation |
| `0x162` | KERNEL_AUTO_BOOST_INVALID_LOCK_RELEASE | Corrupted lock state |
| `0x124` | WHEA_UNCORRECTABLE_ERROR | Hardware-reported error (check WHEA log) |
| `0x9C` | MACHINE_CHECK_EXCEPTION | CPU-detected hardware fault |
| `0x1E` | KMODE_EXCEPTION_NOT_HANDLED | Kernel-mode exception, often driver |
| `0xD1` | DRIVER_IRQL_NOT_LESS_OR_EQUAL | Driver accessed bad memory at high IRQL |

**Pattern rule:** varied stop codes, all memory-integrity flavoured, landing
in *different* OS modules across multiple dumps = memory-corruption
fingerprint pointing at hardware (RAM, memory controller, CPU), not a single
faulty driver. A single dump naming one module is not enough evidence either
way — treat the named module as a possible victim until a pattern across
several dumps confirms or denies it.

## HYPOTHESISE / TEST — symptom → ranked causes

| Suspect | Prior likelihood | Cost/reversibility | Discriminating test |
|---|---|---|---|
| Driver (GPU/NIC/chipset) | High if single module repeats | Free, reversible | Update/reinstall driver |
| Memory overclock (XMP/EXPO) | Medium | 2 min, reversible | Disable in BIOS, watch for recurrence |
| Known OS bug | Medium | Free | Fully patch Windows, check KB errata |
| Physical RAM fault | Medium | Overnight, reversible | MemTest86 (bootable USB) |
| Malware / third-party software | Low if AV clean | Free | Full AV scan; note dump strings can be AV *signatures*, not infections |
| Memory controller / CPU (e.g. Intel Vmin Shift instability) | Rises as above are eliminated | Firmware update: free; chip: RMA | BIOS/microcode update, then time-window observation |
| Motherboard | Low, last resort | Expensive | Component substitution |

**Ordering:** driver update → disable XMP → Windows Update → MemTest86 →
BIOS/microcode update → hardware substitution / RMA. Don't skip ahead
unless evidence (e.g. WHEA hardware events, a MCE) already points strongly
at hardware.

**Known defect worth checking explicitly:** Intel 13th/14th-gen desktop CPUs
(e.g. i9-13900K/14900K family) have a documented **Vmin Shift Instability**
degradation issue. If the pattern is memory-integrity crashes across
different modules, no WHEA events, RAM/overclock/OS ruled out, and the CPU
is in this family — raise this specific hypothesis and point to the
microcode fix (0x12F+) and Intel's extended warranty coverage. A crash
recurring *after* the microcode fix is applied indicates the chip has
already degraded past what firmware can repair.

## RESOLVE — verification & handoff

- For intermittent faults, define the observation window from the
  **pre-fix crash frequency** (e.g. crashes were ~daily → a clean week
  counts as fixed).
- Intel Processor Diagnostic Tool gives an official PASS/FAIL artifact —
  useful for a warranty claim, but a PASS does not clear the chip;
  intermittent degradation often passes short synthetic tests.
- Package the evidence ledger as the handoff document — it doubles as
  warranty-claim / RMA documentation with no extra work.

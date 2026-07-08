import type { CaptureCommandId } from "../tools/captureTool.js";

export interface CaptureCommandSpec {
  description: string;
  powershell: string;
  args: string[];
  notes?: string;
}

/**
 * Single source of truth for the whitelisted CAPTURE commands: the exact
 * PowerShell used both to tell the model what it can run, and to actually
 * run it in commands/captureExecutor.ts. Keeping one copy avoids the tool
 * schema and the executor drifting apart.
 */
export const CAPTURE_COMMANDS_KB: Record<CaptureCommandId, CaptureCommandSpec> = {
  recent_bugcheck_events: {
    description: "Recent unexpected-shutdown / bugcheck events from the System log.",
    powershell:
      "Get-WinEvent -FilterHashtable @{LogName='System'; Id=41,1001,6008} -MaxEvents 15 | " +
      "Format-Table TimeCreated, Id, ProviderName -AutoSize",
    args: [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-WinEvent -FilterHashtable @{LogName='System'; Id=41,1001,6008} -MaxEvents 15 | " +
        "Format-Table TimeCreated, Id, ProviderName -AutoSize",
    ],
  },
  whea_hardware_events: {
    description:
      "Hardware error events (WHEA). Presence makes a raw hardware fault more likely.",
    powershell:
      "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WHEA-Logger'} " +
      "-MaxEvents 15 -ErrorAction SilentlyContinue",
    args: [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WHEA-Logger'} " +
        "-MaxEvents 15 -ErrorAction SilentlyContinue",
    ],
  },
  list_minidumps: {
    description: "Whether crash dumps exist, newest first.",
    powershell: "Get-ChildItem C:\\Windows\\Minidump\\ | Sort-Object LastWriteTime -Descending",
    args: [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-ChildItem C:\\Windows\\Minidump\\ | Sort-Object LastWriteTime -Descending",
    ],
    notes:
      "Requires an elevated process, not just an admin account. An empty/denied " +
      "result can mean no elevation, not necessarily no dumps.",
  },
  stopcode_wer_events: {
    description: "Stop code and parameters for each crash, from Windows Error Reporting.",
    powershell:
      "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WER-SystemErrorReporting'; Id=1001} " +
      "-MaxEvents 5 | Format-List TimeCreated, Message",
    args: [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WER-SystemErrorReporting'; Id=1001} " +
        "-MaxEvents 5 | Format-List TimeCreated, Message",
    ],
  },
};

export interface StopCodeEntry {
  code: string;
  name: string;
  meaning: string;
}

export const STOP_CODE_CHEAT_SHEET: StopCodeEntry[] = [
  { code: "0x50", name: "PAGE_FAULT_IN_NONPAGED_AREA", meaning: "Referenced invalid/freed memory" },
  { code: "0x3B", name: "SYSTEM_SERVICE_EXCEPTION", meaning: "Often 0xc0000005 = access violation" },
  { code: "0x162", name: "KERNEL_AUTO_BOOST_INVALID_LOCK_RELEASE", meaning: "Corrupted lock state" },
  { code: "0x124", name: "WHEA_UNCORRECTABLE_ERROR", meaning: "Hardware-reported error (check WHEA log)" },
  { code: "0x9C", name: "MACHINE_CHECK_EXCEPTION", meaning: "CPU-detected hardware fault" },
  { code: "0x1E", name: "KMODE_EXCEPTION_NOT_HANDLED", meaning: "Kernel-mode exception, often driver" },
  { code: "0xD1", name: "DRIVER_IRQL_NOT_LESS_OR_EQUAL", meaning: "Driver accessed bad memory at high IRQL" },
];

export interface SymptomCauseEntry {
  suspect: string;
  priorLikelihood: string;
  costReversibility: string;
  discriminatingTest: string;
}

export const SYMPTOM_CAUSE_TABLE: SymptomCauseEntry[] = [
  {
    suspect: "Driver (GPU/NIC/chipset)",
    priorLikelihood: "High if single module repeats",
    costReversibility: "Free, reversible",
    discriminatingTest: "Update/reinstall driver",
  },
  {
    suspect: "Memory overclock (XMP/EXPO)",
    priorLikelihood: "Medium",
    costReversibility: "2 min, reversible",
    discriminatingTest: "Disable in BIOS, watch for recurrence",
  },
  {
    suspect: "Known OS bug",
    priorLikelihood: "Medium",
    costReversibility: "Free",
    discriminatingTest: "Fully patch Windows, check KB errata",
  },
  {
    suspect: "Physical RAM fault",
    priorLikelihood: "Medium",
    costReversibility: "Overnight, reversible",
    discriminatingTest: "MemTest86 (bootable USB)",
  },
  {
    suspect: "Malware / third-party software",
    priorLikelihood: "Low if AV clean",
    costReversibility: "Free",
    discriminatingTest: "Full AV scan; note dump strings can be AV signatures, not infections",
  },
  {
    suspect: "Memory controller / CPU (e.g. Intel Vmin Shift instability)",
    priorLikelihood: "Rises as above are eliminated",
    costReversibility: "Firmware update: free; chip: RMA",
    discriminatingTest: "BIOS/microcode update, then time-window observation",
  },
  {
    suspect: "Motherboard",
    priorLikelihood: "Low, last resort",
    costReversibility: "Expensive",
    discriminatingTest: "Component substitution",
  },
];

export const PATTERN_RULE =
  "Pattern rule: varied stop codes, all memory-integrity flavoured, landing in " +
  "different OS modules across multiple dumps = memory-corruption fingerprint " +
  "pointing at hardware (RAM, memory controller, CPU), not a single faulty driver. " +
  "A single dump naming one module is not enough evidence either way - treat the " +
  "named module as a possible victim until a pattern across several dumps confirms " +
  "or denies it.";

export const KNOWN_DEFECTS_NOTE =
  "Known defect worth checking explicitly: Intel 13th/14th-gen desktop CPUs " +
  "(e.g. i9-13900K/14900K family) have a documented Vmin Shift Instability " +
  "degradation issue. If the pattern is memory-integrity crashes across different " +
  "modules, no WHEA events, RAM/overclock/OS ruled out, and the CPU is in this " +
  "family, raise this specific hypothesis and point to the microcode fix (0x12F+) " +
  "and Intel's extended warranty coverage. A crash recurring after the microcode " +
  "fix is applied indicates the chip has already degraded past what firmware can " +
  "repair.";

export const RESOLVE_GUIDANCE =
  "RESOLVE - verification & handoff: for intermittent faults, define the " +
  "observation window from the pre-fix crash frequency (e.g. crashes were ~daily " +
  "-> a clean week counts as fixed). Intel Processor Diagnostic Tool gives an " +
  "official PASS/FAIL artifact, useful for a warranty claim, but a PASS does not " +
  "clear the chip; intermittent degradation often passes short synthetic tests. " +
  "The evidence ledger doubles as the handoff document (ticket / RMA packet / " +
  "postmortem) with no extra formatting work.";

export const TEST_ORDERING =
  "Ordering: driver update -> disable XMP -> Windows Update -> MemTest86 -> " +
  "BIOS/microcode update -> hardware substitution / RMA. Don't skip ahead unless " +
  "evidence (e.g. WHEA hardware events, a MCE) already points strongly at hardware.";

import type { CaptureCommandId } from "../tools/captureTool.js";

/**
 * Canned CAPTURE output for --demo: three bugchecks over two weeks with
 * varied stop codes landing in different modules, plus WHEA events and
 * minidumps present. This is the KB's own "memory-corruption fingerprint"
 * pattern (see PATTERN_RULE in prompt/knowledgeBase.ts) - it's deliberately
 * shaped to walk the model toward the Intel Vmin Shift Instability
 * hypothesis, since that's the richest part of the knowledge base.
 */
export const DEMO_CAPTURE_OUTPUT: Record<CaptureCommandId, string> = {
  recent_bugcheck_events: `TimeCreated           Id   ProviderName
-----------           --   ------------
7/2/2026 10:14:07 PM  1001 Microsoft-Windows-WER-SystemErrorReporting
6/28/2026 9:41:52 AM  1001 Microsoft-Windows-WER-SystemErrorReporting
6/24/2026 4:03:19 PM  41   Microsoft-Windows-Kernel-Power`,

  whea_hardware_events: `TimeCreated           Id   ProviderName
-----------           --   ------------
7/2/2026 10:14:05 PM  19   Microsoft-Windows-WHEA-Logger
6/24/2026 4:03:16 PM   17   Microsoft-Windows-WHEA-Logger`,

  list_minidumps: `    Directory: C:\\Windows\\Minidump

Mode                 LastWriteTime          Length Name
----                 -------------          ------ ----
-a----          7/2/2026  10:14 PM         294912 070226-14476-01.dmp
-a----         6/28/2026   9:42 AM         286720 062826-15203-01.dmp
-a----         6/24/2026   4:04 PM         301056 062426-11890-01.dmp`,

  stopcode_wer_events: `TimeCreated : 7/2/2026 10:14:07 PM
Message     : The computer has rebooted from a bugcheck. The bugcheck was
              0x124 (0x0000000000000000, 0xffffb00a1c2b4028, 0x00000000be000000,
              0x0000000000000800). A dump was saved in: C:\\Windows\\Minidump\\070226-14476-01.dmp.

TimeCreated : 6/28/2026 9:41:52 AM
Message     : The computer has rebooted from a bugcheck. The bugcheck was
              0x3B (0x00000000c0000005, 0xfffff8054a2b1234, 0xffffb00a1c2b4028,
              0x0000000000000000). A dump was saved in: C:\\Windows\\Minidump\\062826-15203-01.dmp.

TimeCreated : 6/24/2026 4:03:19 PM
Message     : The computer has rebooted from a bugcheck. The bugcheck was
              0x1E (0xffffffffc0000005, 0xfffff8054a2b5678, 0x0000000000000000,
              0x0000000000000000). A dump was saved in: C:\\Windows\\Minidump\\062426-11890-01.dmp.`,
};

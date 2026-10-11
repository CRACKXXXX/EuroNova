export const PROJECT_TYPES = [
  { code: "YE", labelKey: "YE" },
  { code: "TC", labelKey: "TC" },
  { code: "ESC", labelKey: "ESC" },
  { code: "PBA", labelKey: "PBA" },
  { code: "SV", labelKey: "SV" },
  { code: "SE", labelKey: "SE" },
  { code: "VET", labelKey: "VET" },
  { code: "CBY", labelKey: "CBY" },
] as const;

export type ProjectTypeCode = (typeof PROJECT_TYPES)[number]["code"];

export const PROJECT_TYPE_COLORS: Record<string, string> = {
  YE: "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/30",
  "Youth Exchange": "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/30",
  TC: "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/30",
  Training: "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/30",
  ESC: "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/30",
  PBA: "bg-nova-flare/15 text-nova-flare border-nova-flare/30",
  SV: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
  SE: "bg-fuchsia-400/15 text-fuchsia-400 border-fuchsia-400/30",
  VET: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  CBY: "bg-sky-400/15 text-sky-400 border-sky-400/30",
};

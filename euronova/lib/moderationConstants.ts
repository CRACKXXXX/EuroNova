export type MuteDuration = 5 | 10 | 15 | 60;

export const MUTE_DURATION_OPTIONS: { minutes: MuteDuration; label: string }[] = [
  { minutes: 5, label: "5 Minutes" },
  { minutes: 10, label: "10 Minutes" },
  { minutes: 15, label: "15 Minutes" },
  { minutes: 60, label: "1 Hour" },
];

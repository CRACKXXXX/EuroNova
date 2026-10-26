import { type useTranslations, type useFormatter } from "next-intl";

export type MissionTranslator = ReturnType<typeof useTranslations>;
export type MissionFormatter = ReturnType<typeof useFormatter>;

export interface MissionInteraction {
  project_id: string;
  is_favorite: boolean;
  is_applied: boolean;
  updated_at: string;
  projects: {
    id: string;
    title: string;
    project_type: string;
    dest_country: string;
    min_age: number;
    max_age: number;
    covers_rup_flights: boolean;
    is_last_minute: boolean;
    themes: string[] | null;
    duration_days?: number;
    travel_budget_min?: number | null;
    travel_budget_max?: number | null;
    financing_type?: string;
    created_at?: string;
    users_org?: {
      org_name?: string;
      verification_status?: string;
      avatar_url?: string;
    } | {
      org_name?: string;
      verification_status?: string;
      avatar_url?: string;
    }[] | null;
  } | null;
}

export interface CustomFolder {
  id: string;
  name: string;
  color: "plasma-cyan" | "hyper-violet" | "rup-emerald" | "nova-flare" | "amber-400";
}

export interface MyMissionsClientProps {
  userId: string;
  initialInteractions: MissionInteraction[];
  initialTab?: "saved" | "applied";
  initialType?: string;
  initialDest?: string;
  initialQuery?: string;
  initialSavedPage?: number;
  initialAppliedPage?: number;
}

export const FILTER_TYPES = ["ALL", "ESC", "YE", "TC", "PBA", "SV", "SE", "VET", "CBY"] as const;
export const ITEMS_PER_PAGE = 50;

export const DEFAULT_CUSTOM_FOLDERS: CustomFolder[] = [
  { id: "summer_2027", name: "Summer 2027", color: "plasma-cyan" },
  { id: "eco_projects", name: "Eco & Green Missions", color: "rup-emerald" },
  { id: "training_priority", name: "Youth Work TCs", color: "hyper-violet" },
];

export const FOLDER_COLOR_CLASSES: Record<CustomFolder["color"], {
  border: string;
  text: string;
  bg: string;
  badge: string;
}> = {
  "plasma-cyan": {
    border: "border-plasma-cyan/40",
    text: "text-plasma-cyan",
    bg: "bg-plasma-cyan/10",
    badge: "bg-plasma-cyan/20 text-plasma-cyan border-plasma-cyan/30",
  },
  "hyper-violet": {
    border: "border-hyper-violet/40",
    text: "text-hyper-violet",
    bg: "bg-hyper-violet/10",
    badge: "bg-hyper-violet/20 text-hyper-violet border-hyper-violet/30",
  },
  "rup-emerald": {
    border: "border-rup-emerald/40",
    text: "text-rup-emerald",
    bg: "bg-rup-emerald/10",
    badge: "bg-rup-emerald/20 text-rup-emerald border-rup-emerald/30",
  },
  "nova-flare": {
    border: "border-nova-flare/40",
    text: "text-nova-flare",
    bg: "bg-nova-flare/10",
    badge: "bg-nova-flare/20 text-nova-flare border-nova-flare/30",
  },
  "amber-400": {
    border: "border-amber-400/40",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    badge: "bg-amber-400/20 text-amber-400 border-amber-400/30",
  },
};

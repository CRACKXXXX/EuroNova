import { type UserRole } from "@/lib/roles";
import {
  type AdminEscalationItem,
  type StaffTicketItem,
} from "../actions";
import { type useTranslations, type useFormatter } from "next-intl";

export type AdminTranslator = ReturnType<typeof useTranslations>;
export type AdminFormatter = ReturnType<typeof useFormatter>;

export type AdminTabType =
  | "orgs"
  | "youth"
  | "projects"
  | "reports"
  | "staff"
  | "escalations"
  | "tickets"
  | "staff_chat";

export interface OrgItem {
  id: string;
  org_name: string | null;
  oid_number?: string | null;
  country_hq: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  login_email?: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  social_linkedin: string | null;
  verification_status: string | null;
  created_at: string;
}

export interface YouthUserItem {
  id: string;
  full_name: string | null;
  birth_date?: string | null;
  country_code: string | null;
  is_rup_region: boolean | null;
  bio: string | null;
  phone: string | null;
  languages: string[] | null;
  avatar_url: string | null;
  email: string | null;
  role?: string | null;
  created_at: string;
}

export interface ProjectItem {
  id: string;
  org_id?: string | null;
  title: string;
  description: string | null;
  project_type: string;
  dest_country: string;
  duration_days?: number | null;
  official_url?: string | null;
  covers_rup_flights?: boolean;
  is_last_minute?: boolean;
  is_scraped?: boolean | null;
  status: string;
  login_email?: string | null;
  created_at: string;
  users_org?: {
    org_name: string | null;
    contact_email?: string | null;
  } | null;
}

export interface ReportItem {
  id: string;
  target_type?: "project" | "organization" | "user" | string;
  project_id?: string | null;
  org_id?: string | null;
  target_user_id?: string | null;
  target_name?: string | null;
  reporter_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  resolution_action?: string | null;
  updated_at?: string | null;
  reporter_name?: string | null;
  reporter_email?: string | null;
  target_user_name?: string | null;
  target_user_email?: string | null;
  projects?: {
    id: string;
    title: string;
    status: string;
    dest_country?: string | null;
    project_type?: string | null;
  } | null;
  users_org?: {
    id: string;
    org_name: string | null;
    verification_status?: string | null;
    contact_email?: string | null;
  } | null;
}

export interface AdminDashboardClientProps {
  currentUserRole?: UserRole;
  pendingOrgs: OrgItem[];
  verifiedOrgs: OrgItem[];
  youthUsers: YouthUserItem[];
  pendingProjects: ProjectItem[];
  publishedProjects: ProjectItem[];
  reports?: ReportItem[];
  escalations?: AdminEscalationItem[];
  totalEscalations?: number;
  totalPendingEscalations?: number;
  tickets?: StaffTicketItem[];
  totalTickets?: number;
  totalPendingTickets?: number;
  totalProjects: number;
  totalOrgs: number;
  totalYouth: number;
  totalStaff?: number;
  totalPendingOrgs: number;
  totalVerifiedOrgs: number;
  totalPendingProjects: number;
  totalPublishedProjects: number;
  totalReports?: number;
  totalPendingReports?: number;
  currentPage: number;
  totalPages: number;
  currentTab?: AdminTabType;
  pageSize?: number;
}

export function isFilled(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const maskedLocal = local.length > 1 ? `${local[0]}***` : "*";
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return "***";
  const visible = trimmed.slice(0, 6);
  return `${visible} *** ***`;
}

export function formatId(id: string | null | undefined, showSensitive: boolean): string {
  if (!id) return "—";
  if (!showSensitive) {
    return `${id.slice(0, 4)}...`;
  }
  return id;
}

export const AUTO_SCRAPER_ORG_ID = "0610184a-a16e-4dcc-a8f6-b9ddef963bf5";

export function isProjectScraped(project: ProjectItem): boolean {
  if (project.is_scraped === true) return true;
  if (!project.org_id) return true;
  if (project.org_id === AUTO_SCRAPER_ORG_ID) return true;

  const orgName = (project.users_org?.org_name || "").trim().toLowerCase();
  if (
    orgName.includes("scraper") ||
    orgName.includes("auto-scraper") ||
    orgName.includes("euronova auto-scraper") ||
    orgName.includes("automated portal")
  ) {
    return true;
  }

  const contactEmail = (project.users_org?.contact_email || "").toLowerCase();
  const loginEmail = (project.login_email || "").toLowerCase();
  if (
    contactEmail.includes("scraper") ||
    loginEmail.includes("scraper") ||
    contactEmail.includes("cron@") ||
    loginEmail.includes("cron@")
  ) {
    return true;
  }

  return false;
}

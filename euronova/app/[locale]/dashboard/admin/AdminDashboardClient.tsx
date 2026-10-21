"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building,
  Users,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Trash2,
  Mail,
  Globe,
  Camera,
  Music,
  PlaySquare,
  Briefcase,
  User,
  Calendar,
  AlertCircle,
  Phone,
  Languages,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Flag,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ExternalLink,
  RotateCcw,
  Edit3,
  Layers,
  Bot,
  X,
  Search,
  MessageSquare,
  Loader2,
  Check,
  Copy,
  Bell,
  AlertTriangle,
  Send,
  Headphones,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { COUNTRIES } from "@/lib/constants/countries";
import { type UserRole, ROLE_BADGE_CONFIG } from "@/lib/roles";
import {
  approveOrganization,
  revokeOrganization,
  deleteOrganization,
  deleteYouthUser,
  publishProject,
  deleteProject,
  dismissReport,
  hideProject,
  requestChanges,
  reopenReport,
  suspendOrganization,
  updateProjectByAdmin,
  deleteReportedComment,
  deleteCommentAndWarnUser,
  deleteCommentAndBanUser,
  updateUserRole,
  searchStaffUsers,
  deleteSurveyAndWarnCreator,
  warnSurveyCreator,
  sendCustomAdminNotification,
  escalateReportToAdmin,
  resolveAdminEscalation,
  updateSupportTicketStatus,
  type StaffSearchUser,
  type AdminProjectEditPayload,
  type AdminEscalationItem,
  type StaffTicketItem,
} from "./actions";

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
  currentTab?: "orgs" | "youth" | "projects" | "reports" | "staff" | "escalations" | "tickets";
  pageSize?: number;
}

function isFilled(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const maskedLocal = local.length > 1 ? `${local[0]}***` : "*";
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return "***";
  const visible = trimmed.slice(0, 6);
  return `${visible} *** ***`;
}

function formatId(id: string | null | undefined, showSensitive: boolean): string {
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

export function AdminDashboardClient({
  currentUserRole = "user",
  pendingOrgs,
  verifiedOrgs,
  youthUsers,
  pendingProjects,
  publishedProjects,
  reports = [],
  escalations = [],
  totalEscalations = 0,
  totalPendingEscalations = 0,
  tickets = [],
  totalTickets = 0,
  totalPendingTickets = 0,
  totalProjects,
  totalOrgs,
  totalYouth,
  totalStaff = 0,
  totalPendingOrgs,
  totalVerifiedOrgs,
  totalPendingProjects,
  totalPublishedProjects,
  totalReports = 0,
  totalPendingReports = 0,
  currentPage,
  totalPages,
  currentTab = "orgs",
  pageSize = 50,
}: AdminDashboardClientProps) {
  const t = useTranslations("AdminPanel");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab strictly bound to URL parameter for resilient state persistence
  const tabFromUrl = searchParams.get("tab") as "orgs" | "youth" | "projects" | "reports" | "staff" | "escalations" | "tickets" | null;
  const activeTab: "orgs" | "youth" | "projects" | "reports" | "staff" | "escalations" | "tickets" =
    tabFromUrl ||
    currentTab ||
    (currentUserRole === "support"
      ? "tickets"
      : currentUserRole === "moderator"
      ? "reports"
      : "orgs");

  const [showSensitive, setShowSensitive] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Escalation creation modal (moderator requesting admin action on a report)
  const [escalateModal, setEscalateModal] = useState<{
    reportId: string;
    targetName: string;
    targetType: string;
    defaultAction: "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate";
  } | null>(null);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateAction, setEscalateAction] = useState<"delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate">("investigate");

  // Escalation resolution modal (admin approving/rejecting escalation)
  const [resolveEscalateModal, setResolveEscalateModal] = useState<{
    escalation: AdminEscalationItem;
    decision: "approved" | "rejected";
  } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  // Support ticket response modal
  const [ticketReplyModal, setTicketReplyModal] = useState<{
    ticket: StaffTicketItem;
  } | null>(null);
  const [ticketReplyMessage, setTicketReplyMessage] = useState("");
  const [ticketReplyStatus, setTicketReplyStatus] = useState<"open" | "in_progress" | "resolved">("resolved");

  // Escalations tab filter
  const [escalationStatusFilter, setEscalationStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Tickets tab filter
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");

  const handleRunScraper = async () => {
    if (isScraping) return;
    setIsScraping(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/scraper/official?secret=Euronova.2007", { method: "GET" });
      if (!res.ok) throw new Error("Scraper failed to run");
      setFeedback({ type: "success", message: "Auto-Scraper executed successfully! Refreshing data..." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Error running scraper. Check console." });
    } finally {
      setIsScraping(false);
    }
  };

  // Custom Delete Modal Configuration State
  const [deleteConfig, setDeleteConfig] = useState<{
    action: () => Promise<{ success?: boolean; error?: string }>;
    title: string;
    message: string;
  } | null>(null);

  // Custom In-App Notification Modal State for Users & Organizations
  const [notifyConfig, setNotifyConfig] = useState<{
    targetId: string;
    targetName: string;
    targetType: "user" | "org";
  } | null>(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyType, setNotifyType] = useState<"system" | "action_required" | "moderation" | "alert">("system");

  const handleSendNotification = () => {
    if (!notifyConfig) return;
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      setFeedback({ type: "error", message: "Notification title and message are required." });
      return;
    }

    startTransition(async () => {
      const res = await sendCustomAdminNotification(
        notifyConfig.targetId,
        notifyTitle,
        notifyMessage,
        notifyType
      );

      if (res.success) {
        setFeedback({
          type: "success",
          message: `In-app notification delivered to "${notifyConfig.targetName}" successfully!`,
        });
        setNotifyConfig(null);
        setNotifyTitle("");
        setNotifyMessage("");
        setNotifyType("system");
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to deliver in-app notification.",
        });
      }
    });
  };

  const handleEscalateSubmit = () => {
    if (!escalateModal) return;
    if (!escalateReason.trim()) {
      setFeedback({ type: "error", message: "An explanation for the escalation is required." });
      return;
    }

    startTransition(async () => {
      const res = await escalateReportToAdmin(
        escalateModal.reportId,
        escalateReason.trim(),
        escalateAction
      );

      if (res?.success) {
        setFeedback({
          type: "success",
          message: "Report successfully escalated to Level 4 Administrators for review.",
        });
        setEscalateModal(null);
        setEscalateReason("");
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res?.error || "Failed to escalate report.",
        });
      }
    });
  };

  const handleResolveEscalateSubmit = () => {
    if (!resolveEscalateModal) return;

    startTransition(async () => {
      const res = await resolveAdminEscalation(
        resolveEscalateModal.escalation.id,
        resolveEscalateModal.decision,
        resolveNotes,
        resolveEscalateModal.decision === "approved"
      );

      if (res?.success) {
        setFeedback({
          type: "success",
          message: `Escalation ${resolveEscalateModal.decision === "approved" ? "approved and executed" : "dismissed"} successfully.`,
        });
        setResolveEscalateModal(null);
        setResolveNotes("");
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res?.error || "Failed to resolve escalation.",
        });
      }
    });
  };

  const handleTicketReplySubmit = () => {
    if (!ticketReplyModal) return;

    startTransition(async () => {
      const res = await updateSupportTicketStatus(
        ticketReplyModal.ticket.id,
        ticketReplyStatus,
        ticketReplyMessage.trim() || undefined
      );

      if (res?.success) {
        setFeedback({
          type: "success",
          message: "Ticket updated and response dispatched to user successfully.",
        });
        setTicketReplyModal(null);
        setTicketReplyMessage("");
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res?.error || "Failed to update support ticket.",
        });
      }
    });
  };

  // Split queue filtering for Projects: "all", "organic" (NGO), "scraper" (Auto-Scraper)
  const [projectOriginFilter, setProjectOriginFilter] = useState<"all" | "organic" | "scraper">("all");

  // Youth user search filter by name, email, or user ID
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Split UI filtering for Moderation Reports: "all", "users" (User & Comment Reports), "projects" (Project & Org Reports), "quarantine" (Quarantine Tray)
  const [reportCategory, setReportCategory] = useState<"all" | "users" | "projects" | "quarantine">("all");

  // Staff & Roles Management State
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState<"all" | "staff" | "moderator" | "support" | "user">("all");
  const [staffUsersList, setStaffUsersList] = useState<StaffSearchUser[]>([]);
  const [hasSearchedStaff, setHasSearchedStaff] = useState(false);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearchStaff = async (queryText?: string) => {
    const q = queryText !== undefined ? queryText : staffSearchQuery;
    setIsSearchingStaff(true);
    setFeedback(null);
    try {
      const res = await searchStaffUsers(q);
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      } else if (res.users) {
        setStaffUsersList(res.users);
        setHasSearchedStaff(true);
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to search staff users." });
    } finally {
      setIsSearchingStaff(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (updatingUserRoleId) return;
    setUpdatingUserRoleId(targetUserId);
    setFeedback(null);
    try {
      const res = await updateUserRole(targetUserId, newRole);
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({
          type: "success",
          message: `User clearance level updated to [${newRole.toUpperCase()}].`,
        });
        setStaffUsersList((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        );
        router.refresh();
      }
    } catch {
      setFeedback({ type: "error", message: "Network error updating user role." });
    } finally {
      setUpdatingUserRoleId(null);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // God Mode Project Edit State
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editForm, setEditForm] = useState<AdminProjectEditPayload>({
    title: "",
    dest_country: "ES",
    project_type: "YE",
    duration_days: null,
    description: "",
    official_url: "",
    covers_rup_flights: false,
    is_last_minute: false,
  });

  const handleOpenEditProject = (proj: ProjectItem) => {
    setEditingProject(proj);
    setEditForm({
      title: proj.title || "",
      dest_country: proj.dest_country || "ES",
      project_type: proj.project_type || "YE",
      duration_days: proj.duration_days ?? null,
      description: proj.description || "",
      official_url: proj.official_url || "",
      covers_rup_flights: proj.covers_rup_flights ?? false,
      is_last_minute: proj.is_last_minute ?? false,
    });
  };

  const handleSaveProjectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    handleAction(async () => {
      const res = await updateProjectByAdmin(editingProject.id, editForm);
      if (res.success) {
        setEditingProject(null);
      }
      return res;
    });
  };

  const handleTabChange = (tab: "orgs" | "youth" | "projects" | "reports" | "staff" | "escalations" | "tickets") => {
    router.push(`?tab=${tab}&page=1`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    router.push(`?tab=${activeTab}&page=${newPage}`);
  };

  const handleAction = (actionFn: () => Promise<{ success?: boolean; error?: string }>) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await actionFn();
      if (res?.error) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({ type: "success", message: "Action executed successfully." });
        router.refresh();
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfig) return;
    const actionToRun = deleteConfig.action;
    setDeleteConfig(null);
    handleAction(actionToRun);
  };

  const renderContactIcons = (org: OrgItem) => {
    const website = isFilled(org.website) ? org.website.trim() : null;
    const instagram = isFilled(org.social_instagram) ? org.social_instagram.trim() : null;
    const tiktok = isFilled(org.social_tiktok) ? org.social_tiktok.trim() : null;
    const youtube = isFilled(org.social_youtube) ? org.social_youtube.trim() : null;
    const linkedin = isFilled(org.social_linkedin) ? org.social_linkedin.trim() : null;
    const rawEmail = isFilled(org.login_email)
      ? org.login_email.trim()
      : isFilled(org.contact_email)
      ? org.contact_email.trim()
      : null;
    const displayEmail = showSensitive ? rawEmail : maskEmail(rawEmail);

    const hasAnyContact = website || instagram || tiktok || youtube || linkedin || rawEmail;
    if (!hasAnyContact) return null;

    return (
      <div className="flex flex-wrap items-center gap-2 mb-4 pt-3 border-t border-void-border/60">
        {rawEmail && (
          <a
            href={`mailto:${rawEmail}`}
            title={`Email: ${rawEmail}`}
            className={`flex items-center gap-1.5 text-xs text-gray-300 hover:text-plasma-cyan bg-void-deep px-2.5 py-1 rounded-md border border-void-border transition-colors ${
              showSensitive ? "break-all whitespace-normal" : "truncate max-w-[200px]"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
            <span className={showSensitive ? "break-all whitespace-normal" : "truncate"}>
              {displayEmail}
            </span>
          </a>
        )}
        {website && (
          <a
            href={website.startsWith("http") ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Website"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
          </a>
        )}
        {instagram && (
          <a
            href={instagram.startsWith("http") ? instagram : `https://${instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </a>
        )}
        {tiktok && (
          <a
            href={tiktok.startsWith("http") ? tiktok : `https://${tiktok}`}
            target="_blank"
            rel="noopener noreferrer"
            title="TikTok"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Music className="w-3.5 h-3.5" />
          </a>
        )}
        {youtube && (
          <a
            href={youtube.startsWith("http") ? youtube : `https://${youtube}`}
            target="_blank"
            rel="noopener noreferrer"
            title="YouTube"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <PlaySquare className="w-3.5 h-3.5" />
          </a>
        )}
        {linkedin && (
          <a
            href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  };

  const renderCountry = (countryCode: string | null) => {
    if (!countryCode) return <span className="text-gray-500">—</span>;
    const c = COUNTRIES.find((x) => x.code === countryCode);
    return c ? (
      <span className="flex items-center gap-1.5 text-xs text-gray-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.flagUrl} alt={c.name} className="w-4 h-auto rounded-[2px]" title={c.name} />
        {c.name}
      </span>
    ) : (
      <span className="text-xs text-gray-400">{countryCode}</span>
    );
  };

  const renderPagination = (totalItems: number) => {
    if (totalPages <= 1 || totalItems === 0) return null;
    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    return (
      <div className="mt-8 pt-6 border-t border-void-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-gray-400 font-medium">
          {t("showingResults", {
            from,
            to,
            total: totalItems,
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-void-border disabled:hover:shadow-none"
          >
            <ChevronLeft className="w-4 h-4 text-plasma-cyan" />
            <span>{t("previous")}</span>
          </button>

          <div className="px-4 py-2 rounded-lg border border-void-border bg-void-deep text-xs font-semibold text-plasma-cyan tracking-wider">
            {t("pageOf", {
              current: currentPage,
              total: totalPages,
            })}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-void-border disabled:hover:shadow-none"
          >
            <span>{t("next")}</span>
            <ChevronRight className="w-4 h-4 text-plasma-cyan" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Header: Navigation Tabs & Privacy Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-void-border">
        {/* Navigation Tabs with True Total Counts */}
        <div className="flex flex-wrap gap-3">
          {(currentUserRole === "admin" || currentUserRole === "root") && (
            <button
              onClick={() => handleTabChange("orgs")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "orgs"
                  ? "bg-hyper-violet/20 border-hyper-violet text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <Building className="w-4 h-4 text-hyper-violet" />
              <span>{t("tabOrgs")}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-hyper-violet/30 text-white font-mono">
                {totalOrgs}
              </span>
            </button>
          )}

          {(currentUserRole === "admin" || currentUserRole === "root") && (
            <button
              onClick={() => handleTabChange("youth")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "youth"
                  ? "bg-plasma-cyan/20 border-plasma-cyan text-white shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <Users className="w-4 h-4 text-plasma-cyan" />
              <span>{t("tabYouth")}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-plasma-cyan/30 text-white font-mono">
                {totalYouth}
              </span>
            </button>
          )}

          {(currentUserRole === "admin" || currentUserRole === "root") && (
            <button
              onClick={() => handleTabChange("projects")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "projects"
                  ? "bg-nova-flare/20 border-nova-flare text-white shadow-[0_0_20px_rgba(255,46,99,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-nova-flare" />
              <span>{t("tabProjects")}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-nova-flare/30 text-white font-mono">
                {totalProjects}
              </span>
            </button>
          )}

          {(currentUserRole === "admin" || currentUserRole === "root" || currentUserRole === "moderator") && (
            <button
              onClick={() => handleTabChange("reports")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "reports"
                  ? "bg-nova-flare/20 border-nova-flare text-white shadow-[0_0_20px_rgba(255,46,99,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <Flag className="w-4 h-4 text-nova-flare" />
              <span>{t("tabReports")}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-nova-flare/30 text-white font-mono flex items-center gap-1.5">
                {totalReports}
                {totalPendingReports > 0 && (
                  <span className="w-2 h-2 rounded-full bg-nova-flare animate-ping inline-block" />
                )}
              </span>
            </button>
          )}

          {(currentUserRole === "admin" || currentUserRole === "root") && (
            <button
              onClick={() => handleTabChange("escalations")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "escalations"
                  ? "bg-amber-500/20 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Escalations</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/30 text-white font-mono flex items-center gap-1.5">
                {totalEscalations}
                {totalPendingEscalations > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                )}
              </span>
            </button>
          )}

          {/* Support Tickets Tab: Visible to ALL staff roles (Support, Moderator, Admin, Root) */}
          <button
            onClick={() => handleTabChange("tickets")}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
              activeTab === "tickets"
                ? "bg-plasma-cyan/20 border-plasma-cyan text-white shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            <Headphones className="w-4 h-4 text-plasma-cyan" />
            <span>Support Tickets</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-plasma-cyan/30 text-white font-mono flex items-center gap-1.5">
              {totalTickets}
              {totalPendingTickets > 0 && (
                <span className="w-2 h-2 rounded-full bg-plasma-cyan animate-ping inline-block" />
              )}
            </span>
          </button>

          {(currentUserRole === "admin" || currentUserRole === "root") && (
            <button
              onClick={() => handleTabChange("staff")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "staff"
                  ? "bg-gradient-to-r from-plasma-cyan/20 to-hyper-violet/20 border-plasma-cyan text-white shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-plasma-cyan" />
              <span>Staff &amp; Roles</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-plasma-cyan/30 text-white font-mono">
                {totalStaff}
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start sm:self-auto">
          {/* Run Auto-Scraper Trigger Button */}
          <button
            type="button"
            onClick={handleRunScraper}
            disabled={isScraping || isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all shadow-sm bg-void-surface border-plasma-cyan/40 text-plasma-cyan hover:bg-plasma-cyan/10 hover:border-plasma-cyan hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 text-plasma-cyan shrink-0 ${isScraping ? "animate-spin" : ""}`} />
            <span>{isScraping ? "Running Scraper..." : "Run Auto-Scraper"}</span>
          </button>

          {/* Privacy Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSensitive((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all shadow-sm ${
              showSensitive
                ? "bg-nova-flare/15 border-nova-flare/40 text-nova-flare hover:bg-nova-flare/25 shadow-[0_0_15px_rgba(255,46,99,0.2)]"
                : "bg-void-surface border-void-border text-gray-300 hover:text-white hover:border-plasma-cyan"
            }`}
          >
            {showSensitive ? (
              <>
                <EyeOff className="w-4 h-4 text-nova-flare shrink-0" />
                <span>Hide Sensitive Data</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-plasma-cyan shrink-0" />
                <span>Show Sensitive Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in duration-300 ${
            feedback.type === "error"
              ? "bg-nova-flare/15 border border-nova-flare/40 text-nova-flare"
              : "bg-rup-emerald/15 border border-rup-emerald/40 text-rup-emerald"
          }`}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <p>{feedback.message}</p>
        </div>
      )}

      {/* TAB 1: ORGANIZATIONS */}
      {activeTab === "orgs" && (
        <div className="space-y-12 animate-in fade-in duration-300">
          {/* Section 1: Pending Verification */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-void-border pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                {t("pending")}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                  {totalPendingOrgs}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-void-surface border border-yellow-400/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-yellow-400/5 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                      {org.org_name || t("unnamed")}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 uppercase tracking-wider shrink-0 ml-2">
                      {t("pendingBadge")}
                    </span>
                  </div>

                  {/* Org ID with privacy mask & full view */}
                  <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    ID: {formatId(org.id, showSensitive)}
                    {org.oid_number ? ` • OID: ${showSensitive ? org.oid_number : `${org.oid_number.slice(0, 4)}...`}` : ""}
                  </div>

                  <div className="mb-3">{renderCountry(org.country_hq)}</div>

                  <p className="text-sm text-gray-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                    {org.description || t("noDescription")}
                  </p>

                  {renderContactIcons(org)}

                  <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-auto pt-2">
                    <button
                      disabled={isPending}
                      onClick={() => handleAction(() => approveOrganization(org.id))}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("approve")}</span>
                    </button>
                    <a
                      href={`mailto:${org.login_email || org.contact_email || ""}?subject=EuroNova%20-%20Action%20Required&body=Hello,%20we%20are%20reviewing%20your%20profile.%20Please%20update%20the%20following:%0A%0A-%20...`}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-400 border border-yellow-400/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("requestChanges")}</span>
                    </a>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setNotifyConfig({
                          targetId: org.id,
                          targetName: org.org_name || "Pending Organization",
                          targetType: "org",
                        });
                        setNotifyTitle("Official Notice: Complete Organization Dossier");
                        setNotifyMessage("");
                        setNotifyType("action_required");
                      }}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Send In-App Notification"
                    >
                      <Bell className="w-3.5 h-3.5 shrink-0" />
                      <span>Notify</span>
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setDeleteConfig({
                          action: () => deleteOrganization(org.id),
                          title: "Reject & Delete Organization",
                          message: `Are you sure you want to permanently delete "${org.org_name || "this organization"}"? This will remove all associated projects and records.`,
                        });
                      }}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("rejectDelete")}</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingOrgs.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                  <p className="text-gray-400 text-sm">{t("noPending")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Verified Entities */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-void-border pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-rup-emerald" />
                {t("verified")}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30">
                  {totalVerifiedOrgs}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {verifiedOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-void-surface border border-rup-emerald/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-rup-emerald/5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                      {org.org_name || t("unnamed")}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 uppercase tracking-wider shrink-0 ml-2">
                      {t("verifiedBadge")}
                    </span>
                  </div>

                  {/* Org ID with privacy mask & full view */}
                  <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    ID: {formatId(org.id, showSensitive)}
                    {org.oid_number ? ` • OID: ${showSensitive ? org.oid_number : `${org.oid_number.slice(0, 4)}...`}` : ""}
                  </div>

                  <div className="mb-3">{renderCountry(org.country_hq)}</div>

                  <p className="text-sm text-gray-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                    {org.description || t("noDescription")}
                  </p>

                  {renderContactIcons(org)}

                  <div className="flex gap-2.5 mt-auto pt-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setNotifyConfig({
                          targetId: org.id,
                          targetName: org.org_name || "Verified Organization",
                          targetType: "org",
                        });
                        setNotifyTitle("EuroNova Administrative Notice");
                        setNotifyMessage("");
                        setNotifyType("system");
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-hyper-violet/10 hover:bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      title="Send In-App Notification"
                    >
                      <Bell className="w-3.5 h-3.5 shrink-0" />
                      <span>Notify</span>
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleAction(() => revokeOrganization(org.id))}
                      className="flex-1 py-2 px-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("revoke")}</span>
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setDeleteConfig({
                          action: () => deleteOrganization(org.id),
                          title: "Delete Verified Entity",
                          message: `Are you sure you want to permanently delete "${org.org_name || "this organization"}"? This action cannot be undone.`,
                        });
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("deleteEntity")}</span>
                    </button>
                  </div>
                </div>
              ))}

              {verifiedOrgs.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                  <p className="text-gray-400 text-sm">{t("noVerified")}</p>
                </div>
              )}
            </div>

            {renderPagination(totalVerifiedOrgs)}
          </div>
        </div>
      )}

      {/* TAB 2: YOUTH USERS */}
      {activeTab === "youth" && (() => {
        const filteredYouthUsers = youthUsers.filter((user) => {
          const q = userSearchQuery.toLowerCase().trim();
          if (!q) return true;
          const nameMatch = (user.full_name || "").toLowerCase().includes(q);
          const emailMatch = (user.email || "").toLowerCase().includes(q);
          const idMatch = (user.id || "").toLowerCase().includes(q);
          const countryMatch = (user.country_code || "").toLowerCase().includes(q);
          const phoneMatch = (user.phone || "").toLowerCase().includes(q);
          return nameMatch || emailMatch || idMatch || countryMatch || phoneMatch;
        });

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-void-border pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <Users className="w-5 h-5 text-plasma-cyan" />
                {t("youthTitle")}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30">
                  {userSearchQuery ? `${filteredYouthUsers.length} of ${totalYouth}` : totalYouth}
                </span>
              </h2>

              {/* Upgraded Youth User Search: Name, Email, ID */}
              <div className="w-full sm:w-80 relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or user ID..."
                  className="w-full bg-void-deep/90 border border-void-border rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-colors"
                />
                {userSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setUserSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredYouthUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-void-surface border border-void-border hover:border-plasma-cyan/40 rounded-2xl p-6 sm:p-7 flex flex-col transition-all shadow-md"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full border-2 border-plasma-cyan/60 overflow-hidden flex items-center justify-center bg-void-deep shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                      {user.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-plasma-cyan/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white break-all whitespace-normal">
                        {user.full_name || t("unnamed")}
                      </h3>
                      <p className={`text-xs text-gray-400 font-mono mt-0.5 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                        {user.email ? (showSensitive ? user.email : maskEmail(user.email)) : "No email"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {renderCountry(user.country_code)}
                        {user.is_rup_region && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                            {t("rupBadge")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Youth Details: Phone & Languages */}
                  <div className="space-y-1.5 mb-3 text-xs">
                    {user.phone && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
                        <span className="text-gray-400 font-medium">{t("phone")}:</span>
                        <span className={`font-mono text-gray-200 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                          {showSensitive ? user.phone : maskPhone(user.phone)}
                        </span>
                      </div>
                    )}
                    {user.languages && user.languages.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Languages className="w-3.5 h-3.5 text-hyper-violet shrink-0" />
                        <span className="text-gray-400 font-medium">{t("languages")}:</span>
                        <span className={`text-gray-200 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                          {user.languages.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Youth Details: Bio */}
                  {user.bio ? (
                    <div className="mb-4 bg-void-deep/60 p-3 rounded-lg border border-void-border/40">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        {t("bio")}
                      </span>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
                        {user.bio}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic mb-4">
                      {t("noDescription")}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-void-border/60 flex items-center justify-between gap-2">
                    <span className={`text-[11px] text-gray-500 font-mono ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                      ID: {formatId(user.id, showSensitive)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setNotifyConfig({
                            targetId: user.id,
                            targetName: user.full_name || user.email || "Youth Volunteer",
                            targetType: "user",
                          });
                          setNotifyTitle("EuroNova Community Notice");
                          setNotifyMessage("");
                          setNotifyType("system");
                        }}
                        className="py-2 px-3 rounded-lg bg-hyper-violet/10 hover:bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        title="Send In-App Notification"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Notify</span>
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => {
                          setDeleteConfig({
                            action: () => deleteYouthUser(user.id),
                            title: "Delete Youth User",
                            message: `Are you sure you want to permanently delete user "${user.full_name || user.email || "this user"}"? This action cannot be undone.`,
                          });
                        }}
                        className="py-2 px-3.5 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("deleteUser")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredYouthUsers.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                  <p className="text-gray-400 text-sm">
                    {userSearchQuery ? `No youth users matching "${userSearchQuery}".` : t("noYouthUsers")}
                  </p>
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery("")}
                      className="mt-2 text-xs text-plasma-cyan hover:underline cursor-pointer font-semibold"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {renderPagination(totalYouth)}
          </div>
        );
      })()}

      {/* TAB 3: PROJECTS */}
      {activeTab === "projects" && (() => {
        const filteredPending = pendingProjects.filter((p) => {
          const isScraped = isProjectScraped(p);
          if (projectOriginFilter === "organic") return !isScraped;
          if (projectOriginFilter === "scraper") return isScraped;
          return true;
        });

        const filteredPublished = publishedProjects.filter((p) => {
          const isScraped = isProjectScraped(p);
          if (projectOriginFilter === "organic") return !isScraped;
          if (projectOriginFilter === "scraper") return isScraped;
          return true;
        });

        const organicCount =
          pendingProjects.filter((p) => !isProjectScraped(p)).length +
          publishedProjects.filter((p) => !isProjectScraped(p)).length;
        const scrapedCount =
          pendingProjects.filter((p) => isProjectScraped(p)).length +
          publishedProjects.filter((p) => isProjectScraped(p)).length;

        return (
          <div className="space-y-10 animate-in fade-in duration-300">
            {/* Origin Switcher (Split Views: All vs Organic vs Auto-Scraper) */}
            <div className="bg-void-surface border border-void-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-plasma-cyan" />
                  <span>Project Origin Filter</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Filter queues between direct NGO publications and automated scraper feeds.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setProjectOriginFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    projectOriginFilter === "all"
                      ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                      : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                  }`}
                >
                  <span>All ({pendingProjects.length + publishedProjects.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProjectOriginFilter("organic")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    projectOriginFilter === "organic"
                      ? "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_12px_rgba(0,230,118,0.2)]"
                      : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Organic NGO ({organicCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProjectOriginFilter("scraper")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    projectOriginFilter === "scraper"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                      : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Auto-Scraper ({scrapedCount})</span>
                </button>
              </div>
            </div>

            {/* Section 1: Pending Review */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-void-border pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-nova-flare animate-pulse" />
                  {t("pendingProjects")}
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30">
                    {projectOriginFilter === "all" ? totalPendingProjects : `${filteredPending.length} of ${totalPendingProjects}`}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPending.map((project) => {
                  const isScraped = isProjectScraped(project);

                  return (
                    <div
                      key={project.id}
                      className="bg-void-surface border border-nova-flare/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-nova-flare/5"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                          {project.title}
                        </h3>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-nova-flare/15 text-nova-flare border border-nova-flare/40 uppercase tracking-wider">
                            {t("pendingBadge")}
                          </span>
                          {isScraped ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                              <Bot className="w-3 h-3" />
                              Auto-Scraped
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              NGO Direct
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Project ID with privacy mask & full view */}
                      <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                        ID: {formatId(project.id, showSensitive)}
                      </div>

                      <p className="text-xs text-plasma-cyan font-medium mb-1">
                        {isScraped ? (project.users_org?.org_name || "EuroNova Auto-Scraper") : (project.users_org?.org_name || t("unnamed"))}
                      </p>

                      {(project.login_email || project.users_org?.contact_email) && (
                        <p className={`text-xs text-gray-400 font-mono mb-3 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                          Contact: {showSensitive ? (project.login_email || project.users_org?.contact_email) : maskEmail(project.login_email || project.users_org?.contact_email)}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>{project.duration_days ? `${project.duration_days} days` : "—"}</span>
                        </div>
                        <span>•</span>
                        <div>{renderCountry(project.dest_country)}</div>
                        <span>•</span>
                        <span className="font-mono text-gray-300">{project.project_type || "YE"}</span>
                      </div>

                      {/* Full description without truncation for Admin review */}
                      <p className="text-sm text-gray-300 mb-6 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                        {project.description || t("noDescription")}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-void-border/50">
                        <button
                          disabled={isPending}
                          onClick={() => handleAction(() => publishProject(project.id))}
                          className="flex-1 min-w-[100px] py-2 px-2.5 rounded-lg bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("approvePublish")}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleOpenEditProject(project)}
                          className="py-2 px-3 rounded-lg bg-plasma-cyan/15 hover:bg-plasma-cyan/25 text-plasma-cyan border border-plasma-cyan/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_10px_rgba(0,229,255,0.15)]"
                          title="God Mode: Edit project details before approval"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Edit</span>
                        </button>
                        <a
                          href={`mailto:${project.login_email || project.users_org?.contact_email || ""}?subject=EuroNova%20-%20Project%20Review:%20${encodeURIComponent(project.title)}&body=Hello,%20your%20project%20was%20flagged.%20Please%20modify%20it%20so%20we%20can%20publish:%0A%0A-%20...`}
                          className="py-2 px-2.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-400 border border-yellow-400/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("requestChanges")}</span>
                        </a>
                        <button
                          disabled={isPending}
                          onClick={() => {
                            setDeleteConfig({
                              action: () => deleteProject(project.id),
                              title: "Delete Pending Project",
                              message: `Are you sure you want to delete "${project.title}"?`,
                            });
                          }}
                          className="py-2 px-2.5 rounded-lg bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredPending.length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                    <p className="text-gray-400 text-sm">{t("noPendingProjects")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Published Projects */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-void-border pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-rup-emerald" />
                  {t("publishedProjects")}
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30">
                    {filteredPublished.length}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPublished.map((project) => {
                  const isScraped = isProjectScraped(project);

                  return (
                    <div
                      key={project.id}
                      className="bg-void-surface border border-void-border hover:border-rup-emerald/30 rounded-2xl p-6 sm:p-7 flex flex-col transition-all shadow-md"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                          {project.title}
                        </h3>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 uppercase tracking-wider">
                            {t("publishedBadge")}
                          </span>
                          {isScraped ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                              <Bot className="w-3 h-3" />
                              Auto-Scraped
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              NGO Direct
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Project ID with privacy mask & full view */}
                      <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                        ID: {formatId(project.id, showSensitive)}
                      </div>

                      <p className="text-xs text-plasma-cyan font-medium mb-1">
                        {isScraped ? (project.users_org?.org_name || "EuroNova Auto-Scraper") : (project.users_org?.org_name || t("unnamed"))}
                      </p>

                      {(project.login_email || project.users_org?.contact_email) && (
                        <p className={`text-xs text-gray-400 font-mono mb-3 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                          Contact: {showSensitive ? (project.login_email || project.users_org?.contact_email) : maskEmail(project.login_email || project.users_org?.contact_email)}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>{project.duration_days ? `${project.duration_days} days` : "—"}</span>
                        </div>
                        <span>•</span>
                        <div>{renderCountry(project.dest_country)}</div>
                        <span>•</span>
                        <span className="font-mono text-gray-300">{project.project_type || "YE"}</span>
                      </div>

                      {/* Full description without truncation for Admin review */}
                      <p className="text-sm text-gray-300 mb-6 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                        {project.description || t("noDescription")}
                      </p>

                      <div className="mt-auto pt-3 border-t border-void-border/50 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleOpenEditProject(project)}
                          className="flex-1 py-2 px-3 rounded-lg bg-plasma-cyan/15 hover:bg-plasma-cyan/25 text-plasma-cyan border border-plasma-cyan/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Edit</span>
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => {
                            setDeleteConfig({
                              action: () => deleteProject(project.id),
                              title: "Delete Published Project",
                              message: `Are you sure you want to delete "${project.title}"? It will be permanently removed from public view.`,
                            });
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("deleteProject")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredPublished.length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                    <p className="text-gray-400 text-sm">{t("noPublishedProjects")}</p>
                  </div>
                )}
              </div>

              {renderPagination(totalPublishedProjects)}
            </div>
          </div>
        );
      })()}

      {/* TAB 4: MODERATION REPORTS */}
      {activeTab === "reports" && (() => {
        const activeReports = reports.filter(
          (r) => r.status === "pending" || r.status === "reviewed"
        );
        const resolvedReports = reports.filter((r) => r.status === "resolved");

        const isQuarantineReport = (r: ReportItem) => {
          const type = r.target_type || (r.project_id ? "project" : r.org_id ? "organization" : "user");
          return (
            type === "quarantine" ||
            (r.reason && r.reason.toLowerCase().includes("quarantine")) ||
            (r.description && r.description.startsWith("[Quarantine"))
          );
        };

        const isUserOrCommentReport = (r: ReportItem) => {
          if (isQuarantineReport(r)) return false;
          const type = r.target_type || (r.project_id ? "project" : r.org_id ? "organization" : "user");
          return type === "user" || type === "comment";
        };

        const isProjectOrOrgReport = (r: ReportItem) => {
          if (isQuarantineReport(r)) return false;
          const type = r.target_type || (r.project_id ? "project" : r.org_id ? "organization" : "user");
          return ["project", "organization", "survey"].includes(type);
        };

        const activeQuarantineReports = activeReports.filter(isQuarantineReport);
        const activeUserReports = activeReports.filter(isUserOrCommentReport);
        const activeProjectReports = activeReports.filter(isProjectOrOrgReport);

        const filteredActiveReports = activeReports.filter((r) => {
          if (reportCategory === "quarantine") return isQuarantineReport(r);
          if (reportCategory === "users") return isUserOrCommentReport(r);
          if (reportCategory === "projects") return isProjectOrOrgReport(r);
          return true;
        });

        const filteredResolvedReports = resolvedReports.filter((r) => {
          if (reportCategory === "quarantine") return isQuarantineReport(r);
          if (reportCategory === "users") return isUserOrCommentReport(r);
          if (reportCategory === "projects") return isProjectOrOrgReport(r);
          return true;
        });

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* 1. TOP BOX: Active Transmissions */}
            <div className="bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-void-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center text-nova-flare shrink-0 shadow-[0_0_15px_rgba(255,46,99,0.25)]">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      <span>{t("activeReportsTitle")}</span>
                      {activeReports.length > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-nova-flare animate-ping inline-block" />
                      )}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      {t("activeReportsSubtitle")}
                    </p>
                  </div>
                </div>

                {/* Triage Summary Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-lg bg-nova-flare/15 border border-nova-flare/30 text-xs font-bold text-nova-flare">
                    Active: {activeReports.length}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border text-xs font-semibold text-gray-300">
                    Total: <strong className="text-white">{totalReports}</strong>
                  </span>
                </div>
              </div>

              {/* Sub-Tabs Split: User & Comment Reports vs Project & Organization Reports vs Quarantine */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setReportCategory("all")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reportCategory === "all"
                      ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.35)]"
                      : "bg-void-deep border border-void-border text-gray-400 hover:text-white"
                  }`}
                >
                  All Reports ({activeReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReportCategory("users")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reportCategory === "users"
                      ? "bg-gradient-to-r from-plasma-cyan to-hyper-violet text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                      : "bg-void-deep border border-void-border text-gray-400 hover:text-white hover:border-hyper-violet/40"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-hyper-violet" />
                  <span>User & Comment Reports</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-hyper-violet/30 text-white font-mono">
                    {activeUserReports.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportCategory("projects")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reportCategory === "projects"
                      ? "bg-nova-flare text-white shadow-[0_0_15px_rgba(255,46,99,0.35)]"
                      : "bg-void-deep border border-void-border text-gray-400 hover:text-white hover:border-nova-flare/40"
                  }`}
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-nova-flare" />
                  <span>Project, Org & Surveys</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-nova-flare/30 text-white font-mono">
                    {activeProjectReports.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportCategory("quarantine")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reportCategory === "quarantine"
                      ? "bg-amber-400 text-void-deep shadow-[0_0_15px_rgba(245,158,11,0.45)]"
                      : "bg-void-deep border border-amber-500/40 text-amber-400 hover:text-white hover:border-amber-400"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quarantine / Suspicious</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-mono font-bold">
                    {activeQuarantineReports.length}
                  </span>
                </button>
              </div>

              {/* Active Reports List */}
              {filteredActiveReports.length === 0 ? (
                <div className="py-14 text-center border border-dashed border-void-border rounded-2xl bg-void-deep/40">
                  <ShieldCheck className="w-12 h-12 text-rup-emerald/70 mx-auto mb-3" />
                  <p className="text-gray-200 font-bold text-base">
                    {reportCategory === "quarantine"
                      ? "Quarantine Tray is Clear."
                      : reportCategory === "users"
                      ? "No pending User or Comment reports."
                      : reportCategory === "projects"
                      ? "No pending Project, Org & Surveys reports."
                      : t("noActiveReports")}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {reportCategory === "quarantine"
                      ? "No suspicious transmissions or auto-moderated content awaiting orbital review."
                      : "No pending reports require moderator intervention in this section."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActiveReports.map((report) => {
                    const targetType = report.target_type || (report.project_id ? "project" : report.org_id ? "organization" : "user");

                    const reasonColor =
                      report.reason === "scam"
                        ? "bg-nova-flare/15 text-nova-flare border-nova-flare/30"
                        : report.reason === "fee"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : report.reason === "broken"
                        ? "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/30"
                        : targetType === "quarantine" || isQuarantineReport(report)
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/30";

                    const statusColor =
                      report.status === "pending"
                        ? "bg-nova-flare/20 text-nova-flare border-nova-flare/40"
                        : "bg-hyper-violet/20 text-hyper-violet border-hyper-violet/40";

                    return (
                      <div
                        key={report.id}
                        className="p-5 sm:p-6 rounded-2xl bg-void-deep/90 border border-void-border hover:border-plasma-cyan/30 transition-all flex flex-col lg:flex-row lg:items-start justify-between gap-6 shadow-sm"
                      >
                        <div className="space-y-4 flex-1 min-w-0">
                          {/* Top metadata row with 360 Target Badges */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            {(targetType === "quarantine" || isQuarantineReport(report)) && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                [QUARANTINE / SUSPICIOUS]
                              </span>
                            )}
                            {targetType === "project" && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/40 flex items-center gap-1 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                                <FolderGit2 className="w-3 h-3" />
                                [PROJECT]
                              </span>
                            )}
                            {targetType === "organization" && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/40 flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
                                <Building className="w-3 h-3" />
                                [ORGANIZATION]
                              </span>
                            )}
                            {targetType === "survey" && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/40 flex items-center gap-1 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                                <MessageSquare className="w-3 h-3" />
                                [SURVEY]
                              </span>
                            )}
                            {(targetType === "user" || targetType === "comment") && !isQuarantineReport(report) && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                                <MessageSquare className="w-3 h-3" />
                                [USER & COMMENT]
                              </span>
                            )}

                            {report.status === "escalated" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                ESCALATED TO ADMIN
                              </span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusColor}`}>
                                {report.status}
                              </span>
                            )}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${reasonColor}`}>
                              {report.reason}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Data Enrichment: For User & Comment Reports */}
                          {(targetType === "user" || targetType === "comment" || targetType === "quarantine" || isQuarantineReport(report)) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 1. Reporter Information Box */}
                              <div className="p-3.5 rounded-xl bg-void-surface border border-void-border/70 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between text-gray-400 pb-1 border-b border-void-border/50">
                                  <span className="font-bold uppercase tracking-wider text-[10px] text-plasma-cyan flex items-center gap-1">
                                    <User className="w-3 h-3 text-plasma-cyan" />
                                    Submitted by (Reporter)
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-0.5">
                                  <span className="text-gray-400">Reporter Name:</span>
                                  <span className="text-white font-bold">
                                    {report.reporter_name || t("anonymousReporter")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">Reporter Email:</span>
                                  <span className="text-gray-300 font-mono">
                                    {report.reporter_email
                                      ? showSensitive
                                        ? report.reporter_email
                                        : maskEmail(report.reporter_email)
                                      : "Anonymous"}
                                  </span>
                                </div>
                              </div>

                              {/* 2. Reported User Information Box */}
                              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
                                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                    Reported User
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-0.5">
                                  <span className="text-gray-400">User Name:</span>
                                  <span className="text-white font-black">
                                    {report.target_user_name || report.target_name || "Unknown User"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">User Email:</span>
                                  <span className="text-gray-200 font-mono font-semibold">
                                    {report.target_user_email
                                      ? showSensitive
                                        ? report.target_user_email
                                        : maskEmail(report.target_user_email)
                                      : "No registered email"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="text-gray-400">User ID:</span>
                                  <span className={`text-plasma-cyan font-bold ${showSensitive ? "break-all" : ""}`}>
                                    {report.target_user_id
                                      ? showSensitive
                                        ? report.target_user_id
                                        : formatId(report.target_user_id, false)
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Project or Organization Target Details */
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                                {targetType === "organization" ? "Reported Organization:" : targetType === "survey" ? "Reported Survey:" : "Reported Mission:"}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {targetType === "survey" && (
                                  <h3 className="text-base font-bold text-white hover:text-plasma-cyan transition-colors">
                                    {report.target_name || "Community Survey"}
                                  </h3>
                                )}

                                {targetType === "project" && (
                                  <>
                                    <h3 className="text-base font-bold text-white hover:text-plasma-cyan transition-colors">
                                      {report.projects?.title || `Project ID: ${report.project_id}`}
                                    </h3>
                                    {report.project_id && (
                                      <a
                                        href={`/dashboard/projects/${report.project_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-plasma-cyan hover:text-white p-1 rounded hover:bg-void-surface transition-colors inline-flex items-center gap-1 text-xs"
                                        title={t("viewProject")}
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="text-[11px] underline">Open Mission</span>
                                      </a>
                                    )}
                                    {report.projects?.status && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-void-surface border border-void-border text-gray-400">
                                        Status: {report.projects.status}
                                      </span>
                                    )}
                                  </>
                                )}

                                {targetType === "organization" && (
                                  <>
                                    <h3 className="text-base font-bold text-white hover:text-hyper-violet transition-colors">
                                      {report.users_org?.org_name || report.target_name || `Org ID: ${report.org_id}`}
                                    </h3>
                                    {report.org_id && (
                                      <a
                                        href={`/dashboard/organizations/${report.org_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-hyper-violet hover:text-white p-1 rounded hover:bg-void-surface transition-colors inline-flex items-center gap-1 text-xs"
                                        title="View Public Organization Profile"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="text-[11px] underline">Open Profile</span>
                                      </a>
                                    )}
                                    {report.users_org?.verification_status && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-void-surface border border-void-border text-gray-400">
                                        Verification: {report.users_org.verification_status}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          {report.description && (
                            <div className="p-3.5 rounded-xl bg-void-surface border border-void-border/70 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                Report Notes / Flagged Content:
                              </span>
                              {report.description}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {/* Action Buttons */}
                        <div className="flex sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 lg:w-52">
                          {/* Specific Action Buttons for User & Comment Reports and Quarantine */}
                          {(targetType === "user" || targetType === "comment" || targetType === "quarantine" || isQuarantineReport(report)) && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleAction(() =>
                                    deleteReportedComment(report.id, undefined, report.target_user_id || undefined)
                                  )
                                }
                                className="flex-1 py-2 px-3 rounded-xl bg-void-surface hover:bg-nova-flare/15 text-gray-300 hover:text-nova-flare border border-void-border hover:border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                                title="Only removes the reported comment or discussion item"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Delete Comment</span>
                              </button>

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleAction(() =>
                                    deleteCommentAndWarnUser(report.id, undefined, report.target_user_id || undefined)
                                  )
                                }
                                className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)] disabled:opacity-50"
                                title="Removes comment and adds an official warning strike to the user"
                              >
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Delete + Warn</span>
                              </button>

                              {currentUserRole === "moderator" ? (
                                <button
                                  type="button"
                                  disabled={isPending || report.status === "escalated"}
                                  onClick={() => {
                                    setEscalateModal({
                                      reportId: report.id,
                                      targetName: report.target_user_name || report.target_name || "Reported User",
                                      targetType: "user",
                                      defaultAction: "ban_user",
                                    });
                                    setEscalateAction("ban_user");
                                    setEscalateReason(`Account suspension request flagged by moderator: ${report.reason}`);
                                  }}
                                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-50"
                                  title="Moderators cannot ban accounts directly. Request Admin Action."
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                  <span>{report.status === "escalated" ? "Escalated" : "Escalate Ban Request"}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => {
                                    setDeleteConfig({
                                      action: () =>
                                        deleteCommentAndBanUser(report.id, undefined, report.target_user_id || undefined),
                                      title: "Ban User Account & Delete Comment",
                                      message: `Are you sure you want to permanently suspend the account of "${report.target_user_name || report.target_name || report.target_user_id}" and delete the reported comment? This user will be barred from EuroNova.`,
                                    });
                                  }}
                                  className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.2)] disabled:opacity-50"
                                  title="Removes comment and bans the user account"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                  <span>Delete + Ban</span>
                                </button>
                              )}
                            </>
                          )}

                          {report.project_id && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setDeleteConfig({
                                    action: () => hideProject(report.project_id!, report.id),
                                    title: "Hide & Reject Reported Project",
                                    message: `This will withdraw the project "${report.projects?.title || report.project_id}" from public view, mark this report as resolved, and schedule it for auto-cleanup after 72h.`,
                                  });
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.15)] disabled:opacity-50"
                              >
                                <EyeOff className="w-3.5 h-3.5 shrink-0" />
                                <span>{t("hideProject")}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleAction(() =>
                                    requestChanges(
                                      report.project_id!,
                                      report.id,
                                      `Moderator request: volunteer report flagged (${report.reason})`
                                    )
                                  )
                                }
                                className="flex-1 py-2 px-3 rounded-xl bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{t("requestChanges")}</span>
                              </button>
                            </>
                          )}

                          {targetType === "survey" && (
                            <>
                              {currentUserRole === "moderator" ? (
                                <button
                                  type="button"
                                  disabled={isPending || report.status === "escalated"}
                                  onClick={() => {
                                    setEscalateModal({
                                      reportId: report.id,
                                      targetName: report.target_name || "Community Survey",
                                      targetType: "survey",
                                      defaultAction: "delete_survey",
                                    });
                                    setEscalateAction("delete_survey");
                                    setEscalateReason(`Survey deletion request flagged by moderator: ${report.reason}`);
                                  }}
                                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-50"
                                  title="Moderators cannot delete surveys directly. Escalate to Admin."
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                  <span>{report.status === "escalated" ? "Escalated" : "Escalate to Admin"}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => {
                                    setDeleteConfig({
                                      action: () =>
                                        deleteSurveyAndWarnCreator(
                                          report.id,
                                          report.target_name || undefined,
                                          report.target_user_id || report.org_id || undefined
                                        ),
                                      title: "Delete Survey & Warn Creator",
                                      message: `Are you sure you want to permanently delete the survey "${report.target_name || "this survey"}" and apply an official disciplinary warning strike (-15 Trust Score) to the creator?`,
                                    });
                                  }}
                                  className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.2)] disabled:opacity-50"
                                  title="Deletes the survey and penalizes the creator's Trust Score"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Delete &amp; Warn</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleAction(() =>
                                    warnSurveyCreator(
                                      report.id,
                                      report.target_user_id || report.org_id || undefined
                                    )
                                  )
                                }
                                className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)] disabled:opacity-50"
                                title="Leaves the survey active but applies a disciplinary warning strike (-15 Trust Score) to the creator"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Warn Only</span>
                              </button>
                            </>
                          )}

                          {targetType === "organization" && report.org_id && (
                            <>
                              {currentUserRole === "moderator" ? (
                                <button
                                  type="button"
                                  disabled={isPending || report.status === "escalated"}
                                  onClick={() => {
                                    setEscalateModal({
                                      reportId: report.id,
                                      targetName: report.users_org?.org_name || "Organization",
                                      targetType: "organization",
                                      defaultAction: "delete_org",
                                    });
                                    setEscalateAction("delete_org");
                                    setEscalateReason(`Organization suspension request flagged by moderator: ${report.reason}`);
                                  }}
                                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-50"
                                  title="Moderators cannot suspend organizations directly. Escalate to Admin."
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                  <span>{report.status === "escalated" ? "Escalated" : "Escalate to Admin"}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => {
                                    setDeleteConfig({
                                      action: () => suspendOrganization(report.org_id!, report.id),
                                      title: "Suspend Reported Organization",
                                      message: `Are you sure you want to suspend this organization? It will be marked as rejected and revoked from publishing.`,
                                    });
                                  }}
                                  className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.15)] disabled:opacity-50"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                  <span>Suspend Org</span>
                                </button>
                              )}
                            </>
                          )}

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAction(() => dismissReport(report.id))}
                            className="flex-1 py-2 px-3 rounded-xl bg-void-surface hover:bg-void-border/60 text-gray-300 hover:text-white border border-void-border font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-rup-emerald shrink-0" />
                            <span>{t("dismissReport")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. BOTTOM BOX: Resolved Log with Undo/Reopen Action */}
            <div className="bg-void-surface/50 border border-void-border/60 rounded-2xl p-6 sm:p-8 opacity-75 grayscale-[15%] transition-all hover:opacity-90 hover:grayscale-0 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-void-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 flex items-center justify-center text-rup-emerald shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-200 tracking-tight flex items-center gap-2">
                      <span>{t("resolvedReportsTitle")}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rup-emerald/10 text-rup-emerald border border-rup-emerald/20 font-mono">
                        {resolvedReports.length}
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      {t("resolvedReportsSubtitle")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-void-deep/80 border border-void-border/60 text-xs text-gray-400 font-mono">
                    Auto-purged via pg_cron (72h)
                  </span>
                </div>
              </div>

              {/* Resolved Reports List */}
              {resolvedReports.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-void-border/60 rounded-2xl bg-void-deep/30">
                  <p className="text-gray-400 text-sm font-medium">{t("noResolvedReports")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resolvedReports.map((report) => {
                    const targetType = report.target_type || (report.project_id ? "project" : report.org_id ? "organization" : "user");

                    return (
                      <div
                        key={report.id}
                        className="p-4 rounded-xl bg-void-deep/60 border border-void-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-void-surface border border-void-border text-plasma-cyan font-mono">
                              [{targetType.toUpperCase()}]
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                              Resolved
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-void-surface border border-void-border text-gray-400 uppercase">
                              {report.reason}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono">
                              Filed: {new Date(report.created_at).toLocaleDateString()}
                            </span>
                            {report.resolved_at && (
                              <span className="text-[11px] text-rup-emerald/80 font-mono">
                                • Resolved: {new Date(report.resolved_at).toLocaleDateString()} {new Date(report.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {report.resolution_action && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30">
                                Action: {report.resolution_action}
                              </span>
                            )}
                            {(() => {
                              const ts = report.updated_at || report.resolved_at || report.created_at;
                              const hoursSinceUpdatedAt = Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60));
                              const remainingHours = Math.max(0, 48 - hoursSinceUpdatedAt);
                              return (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-void-surface border border-nova-flare/30 text-nova-flare flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Auto-deleting in {remainingHours}h
                                </span>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-200">
                              {targetType === "organization"
                                ? (report.users_org?.org_name || report.target_name || `Org: ${report.org_id}`)
                                : targetType === "user" || targetType === "comment" || report.target_user_id
                                ? (report.target_user_name || report.target_name || `User: ${report.target_user_id}`)
                                : (report.projects?.title || `Project: ${report.project_id}`)}
                            </span>
                            {report.project_id && (
                              <a
                                href={`/dashboard/projects/${report.project_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-plasma-cyan p-0.5 transition-colors"
                                title={t("viewProject")}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {report.org_id && (
                              <a
                                href={`/dashboard/organizations/${report.org_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-hyper-violet p-0.5 transition-colors"
                                title="View Organization Profile"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          {report.description && (
                            <p className="text-xs text-gray-400 italic line-clamp-2">
                              &ldquo;{report.description}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Undo / Reopen Button & Status confirmation */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAction(() => reopenReport(report.id))}
                            className="py-1.5 px-3 rounded-lg bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Reopen this report back to pending queue"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Undo / Reopen</span>
                          </button>

                          <div className="flex items-center gap-1.5 text-xs text-rup-emerald/90 font-medium px-3 py-1.5 rounded-lg bg-rup-emerald/10 border border-rup-emerald/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-rup-emerald" />
                            <span className="hidden sm:inline">Closed</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {renderPagination(totalReports)}
          </div>
        );
      })()}

      {/* TAB 5: STAFF & ROLE MANAGEMENT (STRICT ADMIN ONLY) */}
      {activeTab === "staff" && (currentUserRole === "admin" || currentUserRole === "root") && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Section Header */}
          <div className="bg-void-surface border border-plasma-cyan/30 rounded-2xl p-6 sm:p-7 shadow-[0_0_30px_rgba(0,229,255,0.08)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-void-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-plasma-cyan/20 to-hyper-violet/20 border border-plasma-cyan/40 flex items-center justify-center text-plasma-cyan shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    <span>Staff & Role Management</span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-widest font-black">
                      Admin Clearance Only
                    </span>
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                    Grant, promote, or revoke moderation privileges across the EuroNova network. Role updates take effect immediately in both local forums and the admin panel.
                  </p>
                </div>
              </div>

              {/* Total Staff Counter Card */}
              <div className="flex items-center gap-3 bg-void-deep px-4 py-3 rounded-xl border border-void-border shrink-0 self-start md:self-auto">
                <Shield className="w-5 h-5 text-plasma-cyan" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    Network Staff Count
                  </div>
                  <div className="text-lg font-black text-white font-mono">
                    {totalStaff} Verified
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Tier Permission Matrix Reference Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6">
              <div className="bg-void-deep/80 rounded-xl p-3.5 border border-plasma-cyan/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">🛡️</span>
                  <span className="text-xs font-black text-plasma-cyan uppercase tracking-wider">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Full system authority. Manage projects, assign roles, inspect reports, and execute God Mode edits.
                </p>
              </div>

              <div className="bg-void-deep/80 rounded-xl p-3.5 border border-amber-500/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">⚔️</span>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    Moderator
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Resolve reports, Warn, Mute, Ban users, and delete comments. Cannot edit projects or assign roles.
                </p>
              </div>

              <div className="bg-void-deep/80 rounded-xl p-3.5 border border-rup-emerald/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">🎧</span>
                  <span className="text-xs font-black text-rup-emerald uppercase tracking-wider">
                    Support
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  View reports, read community forums, and reply to inquiries. Cannot Warn, Mute, Ban, or Delete.
                </p>
              </div>

              <div className="bg-void-deep/80 rounded-xl p-3.5 border border-void-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">👤</span>
                  <span className="text-xs font-black text-gray-300 uppercase tracking-wider">
                    User
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Standard volunteer. Requires Level 11+ or Organizer status to reply to project questions.
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filters Controls */}
          <div className="bg-void-surface border border-void-border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input for Email or ID */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchStaff();
              }}
              className="flex-1 flex items-center gap-2 max-w-xl"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder="Search by email, user ID, or full name..."
                  className="w-full bg-void-deep border border-void-border rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan font-mono transition-colors"
                />
                {staffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setStaffSearchQuery("");
                      handleSearchStaff("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearchingStaff}
                className="px-4 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs hover:bg-plasma-cyan/90 transition-all shadow-[0_0_12px_rgba(0,229,255,0.25)] flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isSearchingStaff ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </form>

            {/* Role Quick Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setStaffRoleFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  staffRoleFilter === "all"
                    ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                    : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                }`}
              >
                All Users
              </button>
              <button
                type="button"
                onClick={() => setStaffRoleFilter("staff")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  staffRoleFilter === "staff"
                    ? "bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                    : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Staff Only
              </button>
              <button
                type="button"
                onClick={() => setStaffRoleFilter("moderator")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  staffRoleFilter === "moderator"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                }`}
              >
                <span>⚔️</span>
                Moderators
              </button>
              <button
                type="button"
                onClick={() => setStaffRoleFilter("support")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  staffRoleFilter === "support"
                    ? "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                    : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                }`}
              >
                <span>🎧</span>
                Support
              </button>
              <button
                type="button"
                onClick={() => setStaffRoleFilter("user")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  staffRoleFilter === "user"
                    ? "bg-gray-700/50 text-white border border-gray-600"
                    : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                }`}
              >
                Users
              </button>
            </div>
          </div>

          {/* User List & Role Selector Grid */}
          {(() => {
            const rawStaffList: StaffSearchUser[] = hasSearchedStaff
              ? staffUsersList
              : youthUsers.map((y) => ({
                  id: y.id,
                  full_name: y.full_name,
                  email: y.email,
                  role: (y.role || "user") as UserRole,
                  avatar_url: y.avatar_url,
                  created_at: y.created_at,
                }));

            const displayedUsers = rawStaffList.filter((u) => {
              if (staffRoleFilter === "staff") return u.role !== "user";
              if (staffRoleFilter === "moderator") return u.role === "moderator";
              if (staffRoleFilter === "support") return u.role === "support";
              if (staffRoleFilter === "user") return u.role === "user";
              return true;
            });

            if (displayedUsers.length === 0) {
              return (
                <div className="bg-void-surface border border-void-border rounded-2xl p-12 text-center">
                  <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">No Users Found</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    No users matched your query or filter. Try typing a specific email address or user UUID above.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayedUsers.map((u) => {
                  const isRootAdmin = u.email === "euronovaofficial@gmail.com";
                  const roleConfig = ROLE_BADGE_CONFIG[u.role];
                  const isUpdating = updatingUserRoleId === u.id;

                  return (
                    <div
                      key={u.id}
                      className={`bg-void-surface border rounded-2xl p-6 flex flex-col justify-between transition-all shadow-md relative ${
                        u.role === "admin"
                          ? "border-plasma-cyan/40 shadow-[0_0_20px_rgba(0,229,255,0.06)]"
                          : u.role === "moderator"
                          ? "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.06)]"
                          : u.role === "support"
                          ? "border-rup-emerald/40 shadow-[0_0_20px_rgba(0,230,118,0.06)]"
                          : "border-void-border hover:border-gray-700"
                      }`}
                    >
                      <div>
                        {/* User Header: Avatar, Name, Email */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full border-2 border-void-border overflow-hidden flex items-center justify-center bg-void-deep shrink-0">
                            {u.avatar_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={u.avatar_url}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-white break-words">
                              {u.full_name || "Unnamed Volunteer"}
                            </h3>
                            <p
                              className={`text-xs text-gray-400 font-mono mt-0.5 ${
                                showSensitive ? "break-all whitespace-normal" : "truncate"
                              }`}
                            >
                              {u.email
                                ? showSensitive
                                  ? u.email
                                  : maskEmail(u.email)
                                : "No email registered"}
                            </p>
                          </div>
                        </div>

                        {/* User UUID & Copy */}
                        <div className="flex items-center justify-between bg-void-deep/70 px-3 py-1.5 rounded-lg border border-void-border mb-4">
                          <span className="text-[10px] font-mono text-gray-400 truncate">
                            ID: {showSensitive ? u.id : formatId(u.id, false)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(u.id)}
                            className="text-[10px] text-plasma-cyan hover:text-white flex items-center gap-1 font-mono transition-colors ml-2 cursor-pointer"
                            title="Copy User ID"
                          >
                            {copiedId === u.id ? (
                              <>
                                <Check className="w-3 h-3 text-rup-emerald" />
                                <span className="text-rup-emerald">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Current Role Badge */}
                        <div className="mb-4">
                          <div className="text-[10px] uppercase font-mono text-gray-500 mb-1.5 tracking-wider">
                            Active Clearance
                          </div>
                          {roleConfig ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${roleConfig.badgeClass}`}
                            >
                              <span>{roleConfig.icon}</span>
                              <span>{roleConfig.label}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-void-deep text-gray-400 border border-void-border font-medium">
                              <span>👤</span>
                              <span>USER / VOLUNTEER</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Role Selector Control */}
                      <div className="pt-4 border-t border-void-border/70 mt-2">
                        <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                          Assign System Role
                        </label>
                        {isRootAdmin ? (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan text-xs font-bold font-mono">
                            <Shield className="w-4 h-4 shrink-0" />
                            <span>Root Admin (Immutable)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={isUpdating || isPending}
                              onChange={(e) =>
                                handleRoleChange(u.id, e.target.value as UserRole)
                              }
                              className="flex-1 bg-void-deep border border-void-border hover:border-plasma-cyan/50 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-plasma-cyan transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <option value="user">User (Standard Volunteer)</option>
                              <option value="support">🎧 Support Specialist (Tickets &amp; Inquiries)</option>
                              <option value="moderator">⚔️ Moderator (Reports &amp; Forum Shield)</option>
                              {(currentUserRole === "root" || currentUserRole === "admin") && (
                                <option value="admin">🛡️ Administrator (Full God Mode)</option>
                              )}
                            </select>
                            {isUpdating && (
                              <Loader2 className="w-4 h-4 text-plasma-cyan animate-spin shrink-0" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 6: ADMIN ESCALATIONS COMMAND CENTER */}
      {activeTab === "escalations" && (currentUserRole === "admin" || currentUserRole === "root") && (() => {
        const filteredEscalations = escalations.filter((esc) => {
          if (escalationStatusFilter === "all") return true;
          return esc.status === escalationStatusFilter;
        });

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Filter Controls */}
            <div className="bg-void-surface/80 border border-amber-500/30 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <ShieldAlert className="w-6 h-6 text-amber-400" />
                  <span>Administrative Escalations Queue</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                    {totalPendingEscalations} Pending Review
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Actions requiring Level 4 Administrator clearance escalated by External Moderators and Support Specialists.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEscalationStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      escalationStatusFilter === st
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                    }`}
                  >
                    {st === "all" ? "All" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Escalations List */}
            {filteredEscalations.length === 0 ? (
              <div className="bg-void-surface/40 border border-void-border/60 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-rup-emerald mx-auto mb-3 opacity-60" />
                <h3 className="text-lg font-bold text-white mb-1">Clear Skies in Escalations</h3>
                <p className="text-sm text-gray-400">
                  No administrative escalations match your current filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEscalations.map((esc) => {
                  const isPendingStatus = esc.status === "pending";
                  const statusBadgeClass =
                    esc.status === "pending"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : esc.status === "approved" || esc.status === "executed"
                      ? "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/40"
                      : "bg-gray-700/30 text-gray-400 border-gray-600/40";

                  const actionLabel =
                    esc.recommended_action === "delete_survey"
                      ? "Delete Survey & Penalize Creator"
                      : esc.recommended_action === "ban_user"
                      ? "Permanent Account Ban"
                      : esc.recommended_action === "delete_org"
                      ? "Suspend Organization"
                      : "Administrative Investigation";

                  return (
                    <div
                      key={esc.id}
                      className="bg-void-surface/60 border border-void-border/80 rounded-2xl p-6 backdrop-blur-xl hover:border-amber-500/30 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeClass}`}>
                            {esc.status}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-void-deep text-plasma-cyan border border-void-border">
                            Target: {esc.target_type}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            Escalated by: <span className="text-white font-bold">{esc.escalated_by_role.toUpperCase()}</span>
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                          {new Date(esc.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Target Entity / Subject</p>
                          <p className="text-sm font-bold text-white break-all">{esc.target_name || esc.target_id}</p>
                          <p className="text-[11px] text-gray-500 font-mono">Target ID: {esc.target_id}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Recommended Action</p>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {actionLabel}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-void-deep/80 border border-void-border/60 text-xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Escalation Statement</p>
                        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{esc.reason}</p>
                      </div>

                      {esc.admin_notes && (
                        <div className="p-3 rounded-xl bg-plasma-cyan/5 border border-plasma-cyan/20 text-xs space-y-0.5">
                          <p className="text-[10px] font-bold text-plasma-cyan uppercase tracking-wider">Admin Resolution Notes</p>
                          <p className="text-gray-300">{esc.admin_notes}</p>
                        </div>
                      )}

                      {/* Admin Decision Actions */}
                      {isPendingStatus && (
                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setResolveEscalateModal({
                                escalation: esc,
                                decision: "rejected",
                              });
                              setResolveNotes("");
                            }}
                            className="px-4 py-2 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 hover:text-white border border-void-border text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Dismiss Escalation
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setResolveEscalateModal({
                                escalation: esc,
                                decision: "approved",
                              });
                              setResolveNotes("");
                            }}
                            className="px-5 py-2 rounded-xl bg-nova-flare hover:bg-nova-flare/90 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(255,46,99,0.3)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>Approve &amp; Execute Action</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 7: SUPPORT TICKETS & VOLUNTEER INQUIRIES */}
      {activeTab === "tickets" && (() => {
        const filteredTickets = tickets.filter((tk) => {
          if (ticketStatusFilter === "all") return true;
          if (ticketStatusFilter === "open") return tk.status === "open" || tk.status === "pending" || !tk.status;
          return tk.status === ticketStatusFilter;
        });

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Filter Controls */}
            <div className="bg-void-surface/80 border border-plasma-cyan/30 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(0,229,255,0.08)]">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <Headphones className="w-6 h-6 text-plasma-cyan" />
                  <span>Support &amp; Volunteer Inquiries</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 font-mono">
                    {totalPendingTickets} Open
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Manage incoming user tickets, role applications, and dispute communications.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "open", "in_progress", "resolved"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTicketStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      ticketStatusFilter === st
                        ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                        : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
                    }`}
                  >
                    {st === "all" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets List */}
            {filteredTickets.length === 0 ? (
              <div className="bg-void-surface/40 border border-void-border/60 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-rup-emerald mx-auto mb-3 opacity-60" />
                <h3 className="text-lg font-bold text-white mb-1">Inbox Zero</h3>
                <p className="text-sm text-gray-400">
                  No support inquiries match your current filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((tk) => {
                  const isApplySupport = tk.reason === "apply_support";
                  const currentStatus = tk.status || "open";

                  const statusBadgeClass =
                    currentStatus === "resolved"
                      ? "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/40"
                      : currentStatus === "in_progress"
                      ? "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/40"
                      : "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/40";

                  return (
                    <div
                      key={tk.id}
                      className={`bg-void-surface/60 border rounded-2xl p-6 backdrop-blur-xl transition-all space-y-4 ${
                        isApplySupport
                          ? "border-hyper-violet/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                          : "border-void-border/80 hover:border-plasma-cyan/30"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeClass}`}>
                            {currentStatus.replace("_", " ")}
                          </span>
                          {isApplySupport && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40 flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.25)]">
                              <span>🎧</span>
                              Level 10 Vanguard Applicant
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-void-deep text-gray-300 border border-void-border">
                            Reason: {tk.reason}
                          </span>
                          {tk.resolution_action && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30">
                              Action: {tk.resolution_action}
                            </span>
                          )}
                          {currentStatus === "resolved" && (() => {
                            const ts = tk.updated_at || tk.resolved_at || tk.created_at;
                            const hoursSinceUpdatedAt = Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60));
                            const remainingHours = Math.max(0, 48 - hoursSinceUpdatedAt);
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-void-surface border border-nova-flare/30 text-nova-flare flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Auto-deleting in {remainingHours}h
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                          {new Date(tk.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">User Contact</p>
                          <p className="text-white font-bold">{tk.email}</p>
                          {tk.phone && <p className="text-gray-400 font-mono mt-0.5">Phone: {tk.phone}</p>}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Subject</p>
                          <p className="text-white font-bold text-sm">{tk.subject}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-void-deep/80 border border-void-border/60 text-xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message Transmission</p>
                        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">{tk.content}</p>
                      </div>

                      {/* Ticket Action Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                        {currentStatus !== "in_progress" && currentStatus !== "resolved" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              handleAction(() => updateSupportTicketStatus(tk.id, "in_progress"));
                            }}
                            className="px-4 py-2 rounded-xl bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Set In Progress
                          </button>
                        )}
                        {currentStatus !== "resolved" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              handleAction(() => updateSupportTicketStatus(tk.id, "resolved"));
                            }}
                            className="px-4 py-2 rounded-xl bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setTicketReplyModal({ ticket: tk });
                            setTicketReplyMessage("");
                            setTicketReplyStatus("resolved");
                          }}
                          className="px-5 py-2 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Reply &amp; Notify</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* God Mode Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,229,255,0.2)] animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>God Mode: Edit Mission</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30">
                      ADMIN
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Modify mission metadata directly before approving or updating live details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-void-deep transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Mission Title <span className="text-nova-flare">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none focus:ring-1 focus:ring-plasma-cyan"
                  placeholder="Enter full project title..."
                />
              </div>

              {/* Two-column metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Dest Country
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editForm.dest_country || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dest_country: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm uppercase font-mono focus:border-plasma-cyan focus:outline-none"
                    placeholder="e.g. ES, DE, IT"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Project Type
                  </label>
                  <select
                    value={editForm.project_type || "YE"}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, project_type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none"
                  >
                    <option value="YE">Youth Exchange (YE)</option>
                    <option value="TC">Training Course (TC)</option>
                    <option value="ESC">European Solidarity Corps (ESC)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.duration_days ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, duration_days: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none"
                    placeholder="e.g. 14"
                  />
                </div>
              </div>

              {/* Application URL (External redirect) */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  External Application URL
                </label>
                <input
                  type="url"
                  value={editForm.official_url || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, official_url: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm font-mono focus:border-plasma-cyan focus:outline-none"
                  placeholder="https://forms.gle/... or official website"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={5}
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none resize-y"
                  placeholder="Detailed description of the Erasmus+ mission..."
                />
              </div>

              {/* Checkbox Flags */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.covers_rup_flights)}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, covers_rup_flights: e.target.checked }))}
                    className="w-4 h-4 rounded border-void-border bg-void-deep text-rup-emerald focus:ring-rup-emerald"
                  />
                  <span>Covers RUP / Canary Islands Flights</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.is_last_minute)}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, is_last_minute: e.target.checked }))}
                    className="w-4 h-4 rounded border-void-border bg-void-deep text-nova-flare focus:ring-nova-flare"
                  />
                  <span>Last Minute Urgent</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-gray-800 text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isPending ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom In-App Notification Modal for Users & Organizations */}
      {notifyConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/30 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_40px_rgba(0,229,255,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 mb-5 border-b border-void-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Send In-App Notification
                  </h3>
                  <p className="text-xs text-gray-400">
                    Recipient: <span className="text-plasma-cyan font-semibold">{notifyConfig.targetName}</span> ({notifyConfig.targetType === "org" ? "Organization" : "Youth User"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifyConfig(null)}
                disabled={isPending}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Notification Category
                </label>
                <select
                  value={notifyType}
                  onChange={(e) => setNotifyType(e.target.value as "system" | "action_required" | "moderation" | "alert")}
                  disabled={isPending}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none cursor-pointer"
                >
                  <option value="system">System / Announcement</option>
                  <option value="alert">Important Notice / Alert</option>
                  <option value="moderation">Moderation / Policy Notice</option>
                  <option value="action_required">Action Required</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  disabled={isPending}
                  placeholder="e.g., Action Required: Update Profile Details or Warning Notice"
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Transmission Message
                </label>
                <textarea
                  rows={4}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  disabled={isPending}
                  placeholder="Enter official transmission details to be received by the recipient in their notifications..."
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setNotifyConfig(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-gray-800 text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={isPending || !notifyTitle.trim() || !notifyMessage.trim()}
                className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Notification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-nova-flare/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,46,99,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-nova-flare/10 border border-nova-flare/30 rounded-full flex items-center justify-center mb-1">
                <Trash2 className="w-8 h-8 text-nova-flare" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {deleteConfig.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {deleteConfig.message}
              </p>

              <div className="w-full flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteConfig(null)}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold bg-void-deep hover:bg-gray-800 text-gray-300 hover:text-white transition-colors border border-void-border disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold bg-nova-flare hover:bg-nova-flare/90 text-white transition-all shadow-[0_0_20px_rgba(255,46,99,0.35)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 1. Request Admin Action (Escalation) Modal */}
      {escalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Request Admin Action</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ESCALATION
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Forward to Level 4 Administrators for destructive review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEscalateModal(null)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Target Entity
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-void-deep border border-void-border text-white text-sm font-semibold truncate">
                  {escalateModal.targetName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Recommended Admin Action
                </label>
                <select
                  value={escalateAction}
                  onChange={(e) => setEscalateAction(e.target.value as any)}
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="delete_survey">Delete Community Survey &amp; Strike Creator</option>
                  <option value="ban_user">Permanent Account Ban</option>
                  <option value="delete_org">Suspend Organization &amp; Revoke Publishing</option>
                  <option value="emergency_lock">Emergency Lock Entity / Data Quarantine</option>
                  <option value="investigate">Deep Administrative Investigation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Statement / Reason for Escalation *
                </label>
                <textarea
                  rows={4}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  disabled={isPending}
                  placeholder="Detail why administrative intervention is required and summarize evidence..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-amber-400 focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setEscalateModal(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEscalateSubmit}
                disabled={isPending || !escalateReason.trim()}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Escalating...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Transmit Escalation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Admin Escalation Resolution Modal */}
      {resolveEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,229,255,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  resolveEscalateModal.decision === "approved"
                    ? "bg-nova-flare/15 border border-nova-flare/30 text-nova-flare"
                    : "bg-gray-700/20 border border-gray-600/40 text-gray-300"
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{resolveEscalateModal.decision === "approved" ? "Approve & Execute Action" : "Dismiss Escalation"}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Target: {resolveEscalateModal.escalation.target_name || resolveEscalateModal.escalation.target_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveEscalateModal(null)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-void-deep/80 border border-void-border text-xs space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Escalated Reason</p>
                <p className="text-gray-300 whitespace-pre-wrap">{resolveEscalateModal.escalation.reason}</p>
                <p className="text-amber-400 font-bold pt-1">
                  Action: {resolveEscalateModal.escalation.recommended_action}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Administrative Resolution Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  disabled={isPending}
                  placeholder="Notes explaining decision to the staff member who filed..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setResolveEscalateModal(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveEscalateSubmit}
                disabled={isPending}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                  resolveEscalateModal.decision === "approved"
                    ? "bg-nova-flare hover:bg-nova-flare/90 text-white shadow-[0_0_20px_rgba(255,46,99,0.35)]"
                    : "bg-void-deep hover:bg-gray-800 text-gray-300 border border-void-border"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm {resolveEscalateModal.decision === "approved" ? "Execution" : "Dismissal"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Support Ticket Reply Modal */}
      {ticketReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,229,255,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Reply to Volunteer Ticket
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                    {ticketReplyModal.ticket.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTicketReplyModal(null)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5 font-bold uppercase text-[10px]">Recipient</span>
                  <span className="text-white font-mono">{ticketReplyModal.ticket.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 font-bold uppercase text-[10px]">Reason</span>
                  <span className="text-plasma-cyan font-semibold">{ticketReplyModal.ticket.reason}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Ticket Status After Response
                </label>
                <select
                  value={ticketReplyStatus}
                  onChange={(e) => setTicketReplyStatus(e.target.value as any)}
                  disabled={isPending}
                  className="w-full px-3.5 py-2 rounded-xl bg-void-deep border border-void-border text-white text-xs focus:border-plasma-cyan focus:outline-none cursor-pointer"
                >
                  <option value="resolved">Mark as Resolved</option>
                  <option value="in_progress">Keep In Progress</option>
                  <option value="open">Keep Open</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  In-App Notification Message
                </label>
                <textarea
                  rows={4}
                  value={ticketReplyMessage}
                  onChange={(e) => setTicketReplyMessage(e.target.value)}
                  disabled={isPending}
                  placeholder="Enter response message that will be delivered directly to the user's notification tray..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setTicketReplyModal(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTicketReplySubmit}
                disabled={isPending}
                className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatched...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Transmit Response</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

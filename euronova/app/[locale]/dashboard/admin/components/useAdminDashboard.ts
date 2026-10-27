"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { type UserRole } from "@/lib/roles";
import {
  sendCustomAdminNotification,
  escalateReportToAdmin,
  resolveAdminEscalation,
  updateSupportTicketStatus,
  searchStaffUsers,
  updateUserRole,
  updateProjectByAdmin,
  type StaffSearchUser,
  type AdminProjectEditPayload,
  type AdminEscalationItem,
  type StaffTicketItem,
} from "../actions";
import {
  type AdminDashboardClientProps,
  type AdminTabType,
  type ProjectItem,
} from "./AdminTypes";

export function useAdminDashboard(props: AdminDashboardClientProps) {
  const {
    currentUserRole = "user",
    currentTab = "orgs",
    totalPages,
  } = props;

  const t = useTranslations("AdminPanel");
  const tOrgs = useTranslations("Organizations");
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab strictly bound to URL parameter for resilient state persistence
  const tabFromUrl = searchParams.get("tab") as AdminTabType | null;
  const activeTab: AdminTabType =
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

  const handleTabChange = (tab: AdminTabType) => {
    router.push(`?tab=${tab}&page=1`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    router.push(`?tab=${activeTab}&page=${newPage}`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  const handleConfirmDelete = () => {
    if (!deleteConfig) return;
    const actionToRun = deleteConfig.action;
    setDeleteConfig(null);
    handleAction(actionToRun);
  };

  return {
    t,
    tOrgs,
    format,
    router,
    searchParams,
    activeTab,
    showSensitive,
    setShowSensitive,
    isScraping,
    isPending,
    feedback,
    setFeedback,
    escalateModal,
    setEscalateModal,
    escalateReason,
    setEscalateReason,
    escalateAction,
    setEscalateAction,
    resolveEscalateModal,
    setResolveEscalateModal,
    resolveNotes,
    setResolveNotes,
    ticketReplyModal,
    setTicketReplyModal,
    ticketReplyMessage,
    setTicketReplyMessage,
    ticketReplyStatus,
    setTicketReplyStatus,
    escalationStatusFilter,
    setEscalationStatusFilter,
    ticketStatusFilter,
    setTicketStatusFilter,
    handleRunScraper,
    deleteConfig,
    setDeleteConfig,
    notifyConfig,
    setNotifyConfig,
    notifyTitle,
    setNotifyTitle,
    notifyMessage,
    setNotifyMessage,
    notifyType,
    setNotifyType,
    handleSendNotification,
    handleEscalateSubmit,
    handleResolveEscalateSubmit,
    handleTicketReplySubmit,
    projectOriginFilter,
    setProjectOriginFilter,
    userSearchQuery,
    setUserSearchQuery,
    reportCategory,
    setReportCategory,
    staffSearchQuery,
    setStaffSearchQuery,
    staffRoleFilter,
    setStaffRoleFilter,
    staffUsersList,
    setStaffUsersList,
    hasSearchedStaff,
    isSearchingStaff,
    updatingUserRoleId,
    copiedId,
    handleSearchStaff,
    handleRoleChange,
    handleCopyId,
    editingProject,
    setEditingProject,
    editForm,
    setEditForm,
    handleOpenEditProject,
    handleSaveProjectEdit,
    handleTabChange,
    handlePageChange,
    handleAction,
    handleConfirmDelete,
  };
}

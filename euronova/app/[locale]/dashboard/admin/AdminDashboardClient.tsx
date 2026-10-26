"use client";

import React from "react";
import {
  type AdminDashboardClientProps,
  type OrgItem,
  type YouthUserItem,
  type ProjectItem,
  type ReportItem,
  AUTO_SCRAPER_ORG_ID,
  isProjectScraped,
} from "./components/AdminTypes";
import { useAdminDashboard } from "./components/useAdminDashboard";
import { AdminMetrics } from "./components/AdminMetrics";
import { AdminOrgsTab } from "./components/AdminOrgsTab";
import { AdminYouthTab } from "./components/AdminYouthTab";
import { AdminProjectsTab } from "./components/AdminProjectsTab";
import { AdminReportsTab } from "./components/AdminReportsTab";
import { RoleManager } from "./components/RoleManager";
import { EscalationQueue } from "./components/EscalationQueue";
import { AdminTicketsTab } from "./components/AdminTicketsTab";
import { AdminModals } from "./components/AdminModals";

export type {
  OrgItem,
  YouthUserItem,
  ProjectItem,
  ReportItem,
  AdminDashboardClientProps,
};
export { AUTO_SCRAPER_ORG_ID, isProjectScraped };

export function AdminDashboardClient(props: AdminDashboardClientProps) {
  const {
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
    pageSize = 50,
  } = props;

  const {
    t,
    tOrgs,
    format,
    activeTab,
    showSensitive,
    setShowSensitive,
    isScraping,
    isPending,
    feedback,
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
  } = useAdminDashboard(props);

  return (
    <div className="space-y-8">
      {/* 1. Header Metrics, Counters & Control Triggers */}
      <AdminMetrics
        activeTab={activeTab}
        currentUserRole={currentUserRole}
        totalOrgs={totalOrgs}
        totalYouth={totalYouth}
        totalProjects={totalProjects}
        totalReports={totalReports}
        totalPendingReports={totalPendingReports}
        totalEscalations={totalEscalations}
        totalPendingEscalations={totalPendingEscalations}
        totalTickets={totalTickets}
        totalPendingTickets={totalPendingTickets}
        totalStaff={totalStaff}
        showSensitive={showSensitive}
        isScraping={isScraping}
        isPending={isPending}
        feedback={feedback}
        onTabChange={handleTabChange}
        onRunScraper={handleRunScraper}
        onToggleSensitive={() => setShowSensitive((prev) => !prev)}
        t={t}
      />

      {/* 2. Modular Tab Domains */}
      {activeTab === "orgs" && (
        <AdminOrgsTab
          pendingOrgs={pendingOrgs}
          verifiedOrgs={verifiedOrgs}
          totalPendingOrgs={totalPendingOrgs}
          totalVerifiedOrgs={totalVerifiedOrgs}
          showSensitive={showSensitive}
          isPending={isPending}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          handleAction={handleAction}
          setNotifyConfig={setNotifyConfig}
          setNotifyTitle={setNotifyTitle}
          setNotifyMessage={setNotifyMessage}
          setNotifyType={setNotifyType}
          setDeleteConfig={setDeleteConfig}
          t={t}
          tOrgs={tOrgs}
        />
      )}

      {activeTab === "youth" && (
        <AdminYouthTab
          youthUsers={youthUsers}
          totalYouth={totalYouth}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          showSensitive={showSensitive}
          isPending={isPending}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          setNotifyConfig={setNotifyConfig}
          setNotifyTitle={setNotifyTitle}
          setNotifyMessage={setNotifyMessage}
          setNotifyType={setNotifyType}
          setDeleteConfig={setDeleteConfig}
          t={t}
        />
      )}

      {activeTab === "projects" && (
        <AdminProjectsTab
          pendingProjects={pendingProjects}
          publishedProjects={publishedProjects}
          totalPendingProjects={totalPendingProjects}
          totalPublishedProjects={totalPublishedProjects}
          projectOriginFilter={projectOriginFilter}
          setProjectOriginFilter={setProjectOriginFilter}
          showSensitive={showSensitive}
          isPending={isPending}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          handleAction={handleAction}
          handleOpenEditProject={handleOpenEditProject}
          setDeleteConfig={setDeleteConfig}
          t={t}
        />
      )}

      {activeTab === "reports" && (
        <AdminReportsTab
          reports={reports}
          totalReports={totalReports}
          reportCategory={reportCategory}
          setReportCategory={setReportCategory}
          currentUserRole={currentUserRole}
          showSensitive={showSensitive}
          isPending={isPending}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          handleAction={handleAction}
          setEscalateModal={setEscalateModal}
          setEscalateAction={setEscalateAction}
          setEscalateReason={setEscalateReason}
          setDeleteConfig={setDeleteConfig}
          t={t}
          format={format}
        />
      )}

      {activeTab === "staff" && (currentUserRole === "admin" || currentUserRole === "root") && (
        <RoleManager
          currentUserRole={currentUserRole}
          totalStaff={totalStaff}
          staffSearchQuery={staffSearchQuery}
          setStaffSearchQuery={setStaffSearchQuery}
          staffRoleFilter={staffRoleFilter}
          setStaffRoleFilter={setStaffRoleFilter}
          staffUsersList={staffUsersList}
          hasSearchedStaff={hasSearchedStaff}
          isSearchingStaff={isSearchingStaff}
          updatingUserRoleId={updatingUserRoleId}
          copiedId={copiedId}
          youthUsers={youthUsers}
          showSensitive={showSensitive}
          isPending={isPending}
          handleSearchStaff={handleSearchStaff}
          handleRoleChange={handleRoleChange}
          handleCopyId={handleCopyId}
          t={t}
        />
      )}

      {activeTab === "escalations" && (currentUserRole === "admin" || currentUserRole === "root") && (
        <EscalationQueue
          escalations={escalations}
          totalPendingEscalations={totalPendingEscalations}
          escalationStatusFilter={escalationStatusFilter}
          onFilterChange={setEscalationStatusFilter}
          onOpenResolveModal={(esc, decision) => {
            setResolveEscalateModal({ escalation: esc, decision });
            setResolveNotes("");
          }}
          isPending={isPending}
          t={t}
          format={format}
        />
      )}

      {activeTab === "tickets" && (
        <AdminTicketsTab
          tickets={tickets}
          totalPendingTickets={totalPendingTickets}
          ticketStatusFilter={ticketStatusFilter}
          setTicketStatusFilter={setTicketStatusFilter}
          isPending={isPending}
          handleAction={handleAction}
          setTicketReplyModal={setTicketReplyModal}
          setTicketReplyMessage={setTicketReplyMessage}
          setTicketReplyStatus={setTicketReplyStatus}
          t={t}
          format={format}
        />
      )}

      {/* 3. Global Modal Dialogs */}
      <AdminModals
        editingProject={editingProject}
        setEditingProject={setEditingProject}
        editForm={editForm}
        setEditForm={setEditForm}
        handleSaveProjectEdit={handleSaveProjectEdit}
        notifyConfig={notifyConfig}
        setNotifyConfig={setNotifyConfig}
        notifyTitle={notifyTitle}
        setNotifyTitle={setNotifyTitle}
        notifyMessage={notifyMessage}
        setNotifyMessage={setNotifyMessage}
        notifyType={notifyType}
        setNotifyType={setNotifyType}
        handleSendNotification={handleSendNotification}
        deleteConfig={deleteConfig}
        setDeleteConfig={setDeleteConfig}
        handleConfirmDelete={handleConfirmDelete}
        escalateModal={escalateModal}
        setEscalateModal={setEscalateModal}
        escalateAction={escalateAction}
        setEscalateAction={setEscalateAction}
        escalateReason={escalateReason}
        setEscalateReason={setEscalateReason}
        handleEscalateSubmit={handleEscalateSubmit}
        resolveEscalateModal={resolveEscalateModal}
        setResolveEscalateModal={setResolveEscalateModal}
        resolveNotes={resolveNotes}
        setResolveNotes={setResolveNotes}
        handleResolveEscalateSubmit={handleResolveEscalateSubmit}
        ticketReplyModal={ticketReplyModal}
        setTicketReplyModal={setTicketReplyModal}
        ticketReplyMessage={ticketReplyMessage}
        setTicketReplyMessage={setTicketReplyMessage}
        ticketReplyStatus={ticketReplyStatus}
        setTicketReplyStatus={setTicketReplyStatus}
        handleTicketReplySubmit={handleTicketReplySubmit}
        isPending={isPending}
        t={t}
      />
    </div>
  );
}

export default AdminDashboardClient;

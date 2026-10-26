"use client";

import React from "react";
import { type UserRole } from "@/lib/roles";
import { type AdminTabType, type AdminTranslator } from "./AdminTypes";
import {
  Building,
  Users,
  FolderGit2,
  Flag,
  ShieldAlert,
  Headphones,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface AdminMetricsProps {
  activeTab: AdminTabType;
  currentUserRole: UserRole;
  totalOrgs: number;
  totalYouth: number;
  totalProjects: number;
  totalReports: number;
  totalPendingReports: number;
  totalEscalations: number;
  totalPendingEscalations: number;
  totalTickets: number;
  totalPendingTickets: number;
  totalStaff: number;
  showSensitive: boolean;
  isScraping: boolean;
  isPending: boolean;
  feedback: { type: "success" | "error"; message: string } | null;
  onTabChange: (tab: AdminTabType) => void;
  onRunScraper: () => void;
  onToggleSensitive: () => void;
  t: AdminTranslator;
}

export function AdminMetrics({
  activeTab,
  currentUserRole,
  totalOrgs,
  totalYouth,
  totalProjects,
  totalReports,
  totalPendingReports,
  totalEscalations,
  totalPendingEscalations,
  totalTickets,
  totalPendingTickets,
  totalStaff,
  showSensitive,
  isScraping,
  isPending,
  feedback,
  onTabChange,
  onRunScraper,
  onToggleSensitive,
  t,
}: AdminMetricsProps) {
  return (
    <div className="space-y-6">
      {/* Top Header: Navigation Tabs & Privacy Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-void-border">
        {/* Navigation Tabs with True Total Counts */}
        <div className="flex flex-wrap gap-3">
          {(currentUserRole === "admin" || currentUserRole === "root") && (
            <button
              onClick={() => onTabChange("orgs")}
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
              onClick={() => onTabChange("youth")}
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
              onClick={() => onTabChange("projects")}
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
              onClick={() => onTabChange("reports")}
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
              onClick={() => onTabChange("escalations")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "escalations"
                  ? "bg-amber-500/20 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{t("tabEscalationsLabel")}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/30 text-white font-mono flex items-center gap-1.5">
                {totalEscalations}
                {totalPendingEscalations > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                )}
              </span>
            </button>
          )}

          {/* Support Tickets Tab */}
          <button
            onClick={() => onTabChange("tickets")}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
              activeTab === "tickets"
                ? "bg-plasma-cyan/20 border-plasma-cyan text-white shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            <Headphones className="w-4 h-4 text-plasma-cyan" />
            <span>{t("tabSupportTicketsLabel")}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-plasma-cyan/30 text-white font-mono flex items-center gap-1.5">
              {totalTickets}
              {totalPendingTickets > 0 && (
                <span className="w-2 h-2 rounded-full bg-plasma-cyan animate-ping inline-block" />
              )}
            </span>
          </button>

          {(currentUserRole === "admin" || currentUserRole === "root") && (
            <button
              onClick={() => onTabChange("staff")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                activeTab === "staff"
                  ? "bg-gradient-to-r from-plasma-cyan/20 to-hyper-violet/20 border-plasma-cyan text-white shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-plasma-cyan" />
              <span>{t("tabStaffRolesLabel")}</span>
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
            onClick={onRunScraper}
            disabled={isScraping || isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all shadow-sm bg-void-surface border-plasma-cyan/40 text-plasma-cyan hover:bg-plasma-cyan/10 hover:border-plasma-cyan hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 text-plasma-cyan shrink-0 ${isScraping ? "animate-spin" : ""}`} />
            <span>{isScraping ? "Running Scraper..." : "Run Auto-Scraper"}</span>
          </button>

          {/* Privacy Toggle Button */}
          <button
            type="button"
            onClick={onToggleSensitive}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all shadow-sm ${
              showSensitive
                ? "bg-nova-flare/15 border-nova-flare/40 text-nova-flare hover:bg-nova-flare/25 shadow-[0_0_15px_rgba(255,46,99,0.2)]"
                : "bg-void-surface border-void-border text-gray-300 hover:text-white hover:border-plasma-cyan"
            }`}
          >
            {showSensitive ? (
              <>
                <EyeOff className="w-4 h-4 text-nova-flare shrink-0" />
                <span>{t("hideSensitiveData")}</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-plasma-cyan shrink-0" />
                <span>{t("showSensitiveData")}</span>
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
    </div>
  );
}

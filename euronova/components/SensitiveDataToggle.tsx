"use client";

import React from "react";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/lib/roles";

interface SensitiveDataToggleProps {
  showSensitive: boolean;
  onToggle: () => void;
  currentUserRole?: UserRole | string;
  className?: string;
  disabled?: boolean;
}

export function SensitiveDataToggle({
  showSensitive,
  onToggle,
  currentUserRole,
  className = "",
  disabled = false,
}: SensitiveDataToggleProps) {
  const t = useTranslations("AdminPanel");
  const isSupport = currentUserRole === "support";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={showSensitive}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          showSensitive
            ? "bg-nova-flare/15 border-nova-flare/40 text-nova-flare hover:bg-nova-flare/25 shadow-[0_0_15px_rgba(255,46,99,0.2)]"
            : "bg-void-surface border-void-border text-gray-300 hover:text-white hover:border-plasma-cyan shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        }`}
      >
        {showSensitive ? (
          <>
            <EyeOff className="w-3.5 h-3.5 text-nova-flare shrink-0" />
            <span>{t("hideSensitiveData")}</span>
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
            <span>{t("showSensitiveData")}</span>
          </>
        )}
      </button>

      {/* Role Context Indicator */}
      {showSensitive && isSupport && (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30"
          title={t("supportPrivacyTooltip")}
        >
          <Lock className="w-2.5 h-2.5 text-amber-400" />
          <span>{t("supportPrivacyActive")}</span>
        </span>
      )}

      {showSensitive && !isSupport && (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-rup-emerald/10 text-rup-emerald border border-rup-emerald/30"
          title={t("moderatorAccessTooltip")}
        >
          <Shield className="w-2.5 h-2.5 text-rup-emerald" />
          <span>{t("moderatorAccess")}</span>
        </span>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { COUNTRIES } from "@/lib/constants/countries";
import {
  Globe,
  Mail,
  Camera,
  Music,
  PlaySquare,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  type OrgItem,
  isFilled,
  maskEmail,
} from "./AdminTypes";

interface ContactIconsProps {
  org: OrgItem;
  showSensitive: boolean;
  tOrgs: (key: string) => string;
}

export function ContactIcons({ org, showSensitive, tOrgs }: ContactIconsProps) {
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
    <div className="flex flex-wrap items-center gap-2 mb-4 pt-2 border-t border-void-border/60">
      {website && (
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          title={tOrgs("websiteTitle")}
          className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
        </a>
      )}
      {rawEmail && (
        <a
          href={`mailto:${rawEmail}`}
          title={displayEmail || undefined}
          className="h-7 px-2 rounded-md bg-void-deep border border-void-border flex items-center gap-1.5 text-xs text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono text-[11px] truncate max-w-[120px]">{displayEmail}</span>
        </a>
      )}
      {instagram && (
        <a
          href={instagram.startsWith("http") ? instagram : `https://${instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          title={tOrgs("instagramTitle")}
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
          title={tOrgs("tiktokTitle")}
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
          title={tOrgs("youtubeTitle")}
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
          title={tOrgs("linkedinTitle")}
          className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
        >
          <Briefcase className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

export function CountryBadge({ countryCode }: { countryCode: string | null }) {
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
}

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  isPending: boolean;
  onPageChange: (page: number) => void;
  showingResultsText: string;
  previousText: string;
  nextText: string;
  pageOfText: string;
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  isPending,
  onPageChange,
  showingResultsText,
  previousText,
  nextText,
  pageOfText,
}: AdminPaginationProps) {
  if (totalPages <= 1 || totalItems === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-void-border flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs sm:text-sm text-gray-400 font-medium">
        {showingResultsText}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-void-border disabled:hover:shadow-none"
        >
          <ChevronLeft className="w-4 h-4 text-plasma-cyan" />
          <span>{previousText}</span>
        </button>

        <div className="px-4 py-2 rounded-lg border border-void-border bg-void-deep text-xs font-semibold text-plasma-cyan tracking-wider">
          {pageOfText}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-void-border disabled:hover:shadow-none"
        >
          <span>{nextText}</span>
          <ChevronRight className="w-4 h-4 text-plasma-cyan" />
        </button>
      </div>
    </div>
  );
}

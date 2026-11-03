"use client";

import { useState } from "react";
import { Building, MapPin, Globe, Camera, Music, PlaySquare, Briefcase, Mail, Share2, Check } from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";
import { TermTooltip } from "@/components/TermTooltip";
import { AvatarFallback } from "@/components/AvatarFallback";
import { CosmicTooltip } from "@/components/CosmicTooltip";

export interface OrganizationData {
  id: string;
  org_name?: string | null;
  entity_type?: string | null;
  country_hq?: string | null;
  verification_status?: string | null;
  description?: string | null;
  website?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_youtube?: string | null;
  social_linkedin?: string | null;
  contact_email?: string | null;
  logo_url?: string | null;
  avatar_url?: string | null;
  pic_number?: string | null;
  oid_number?: string | null;
}

export function OrganizationCard({ org }: { org: OrganizationData }) {
  const t = useTranslations("Organizations");
  const [copied, setCopied] = useState(false);

  const logoUrl = org.logo_url || org.avatar_url;
  const picValue = org.pic_number;
  const oidValue = org.oid_number;

  const website = typeof org.website === "string" && org.website.trim().length > 0 ? org.website.trim() : null;
  const instagram = typeof org.social_instagram === "string" && org.social_instagram.trim().length > 0 ? org.social_instagram.trim() : null;
  const tiktok = typeof org.social_tiktok === "string" && org.social_tiktok.trim().length > 0 ? org.social_tiktok.trim() : null;
  const youtube = typeof org.social_youtube === "string" && org.social_youtube.trim().length > 0 ? org.social_youtube.trim() : null;
  const linkedin = typeof org.social_linkedin === "string" && org.social_linkedin.trim().length > 0 ? org.social_linkedin.trim() : null;
  const email = typeof org.contact_email === "string" && org.contact_email.trim().length > 0 ? org.contact_email.trim() : null;

  const hasAnyContact = website || instagram || tiktok || youtube || linkedin || email;

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!org.id) return;
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/dashboard/organizations/${org.id}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="bg-void-surface border border-void-border rounded-2xl p-6 hover:border-hyper-violet/60 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(99,102,241,0.25),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:-translate-y-2 hover:scale-[1.01] group/org flex flex-col h-full relative overflow-visible">
      {/* Shimmer Sheen on Hover */}
      <div className="absolute inset-0 -translate-x-full group-hover/org:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-hyper-violet/10 to-transparent pointer-events-none rounded-2xl overflow-hidden" />

      {/* Ambient Internal Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-hyper-violet/5 rounded-full blur-2xl pointer-events-none group-hover/org:bg-hyper-violet/15 transition-colors duration-500" />

      <div className="flex items-start gap-4 mb-4">
        {/* Default Avatar Fallback or Actual Logo */}
        <AvatarFallback
          src={logoUrl}
          alt={org.org_name || "Organization"}
          fallbackType="org"
          name={org.org_name}
          sizeClassName="w-12 h-12"
          className="border border-void-border bg-void-deep shadow-[0_0_15px_rgba(99,102,241,0.15)] group-hover/org:scale-105 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0"
          iconClassName="w-6 h-6 text-plasma-cyan"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold text-white group-hover/org:text-hyper-violet transition-colors line-clamp-1">
              {org.org_name || t("unnamedOrg")}
            </h2>
            {org.verification_status === "verified" && (
              <span className="px-2 py-0.5 rounded-md bg-rup-emerald/10 border border-rup-emerald/30 text-[10px] font-bold text-rup-emerald uppercase tracking-wider shrink-0 shadow-[0_0_10px_rgba(0,230,118,0.2)]">
                {t("verified")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
            {(() => {
              if (!org.country_hq) return <span className="text-sm text-gray-400">{t("countryNotSpecified")}</span>;
              const c = COUNTRIES.find((x) => x.code === org.country_hq);
              return c ? (
                <span className="text-sm text-gray-400 flex items-center gap-1.5 truncate">
                  <Image src={c.flagUrl} alt={c.name} width={16} height={12} unoptimized className="w-4 h-auto rounded-[2px]" />
                  <span className="truncate">{c.name}</span>
                </span>
              ) : (
                <span className="text-sm text-gray-400 truncate">{org.country_hq}</span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Entity Type, OID & PIC Badges with Tooltips if present */}
      {(picValue || oidValue || org.entity_type) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {org.entity_type && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-void-deep border border-void-border text-gray-300 uppercase tracking-wider">
              {org.entity_type === "informal_group"
                ? t("entityTypeInformalGroup")
                : org.entity_type === "public_body"
                ? t("entityTypePublicBody")
                : t("entityTypeNgo")}
            </span>
          )}

          {oidValue && (
            <TermTooltip term="OID">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-hyper-violet/10 border border-hyper-violet/30 text-hyper-violet cursor-help">
                OID: {oidValue}
              </span>
            </TermTooltip>
          )}

          {picValue && (
            <TermTooltip term="PIC">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan cursor-help">
                PIC: {picValue}
              </span>
            </TermTooltip>
          )}
        </div>
      )}

      {/* Description */}
      <p className="text-gray-400 text-sm line-clamp-3 mb-4 leading-relaxed font-light flex-1">
        {org.description || t("noDescription")}
      </p>

      {/* Social Links & Contact Channels */}
      {hasAnyContact && (
        <div className="pt-3 border-t border-void-border/60 flex items-center gap-2 flex-wrap">
          {website && (
            <CosmicTooltip content={t("websiteTitle")} side="top">
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("websiteTitle")}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all hover:scale-105 active:scale-95"
              >
                <Globe className="w-4 h-4" />
              </a>
            </CosmicTooltip>
          )}
          {instagram && (
            <CosmicTooltip content={t("instagramTitle")} side="top">
              <a
                href={instagram.startsWith("http") ? instagram : `https://${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("instagramTitle")}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all hover:scale-105 active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </a>
            </CosmicTooltip>
          )}
          {tiktok && (
            <CosmicTooltip content={t("tiktokTitle")} side="top">
              <a
                href={tiktok.startsWith("http") ? tiktok : `https://${tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("tiktokTitle")}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all hover:scale-105 active:scale-95"
              >
                <Music className="w-4 h-4" />
              </a>
            </CosmicTooltip>
          )}
          {youtube && (
            <CosmicTooltip content={t("youtubeTitle")} side="top">
              <a
                href={youtube.startsWith("http") ? youtube : `https://${youtube}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("youtubeTitle")}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all hover:scale-105 active:scale-95"
              >
                <PlaySquare className="w-4 h-4" />
              </a>
            </CosmicTooltip>
          )}
          {linkedin && (
            <CosmicTooltip content={t("linkedinTitle")} side="top">
              <a
                href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("linkedinTitle")}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all hover:scale-105 active:scale-95"
              >
                <Briefcase className="w-4 h-4" />
              </a>
            </CosmicTooltip>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-plasma-cyan transition-colors ml-auto bg-void-deep px-3 py-1.5 rounded-lg border border-void-border hover:border-plasma-cyan/30"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t("contact")}</span>
            </a>
          )}
        </div>
      )}

      <div className="pt-4 mt-4 border-t border-void-border flex items-center gap-2">
        <Link
          href={org.id ? `/dashboard/organizations/${org.id}` : "#"}
          className={`flex-1 py-2.5 rounded-xl bg-hyper-violet/10 hover:bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30 font-bold text-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex justify-center items-center gap-2 group-hover/org:shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
            !org.id ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Building className="w-4 h-4 shrink-0" />
          <span className="truncate">{t("viewProfile")}</span>
        </Link>

        {org.id && (
          <CosmicTooltip content={copied ? t("copiedLink") : t("shareView")} side="top">
            <button
              type="button"
              onClick={handleShare}
              aria-label={copied ? t("copiedLink") : t("shareView")}
              className="py-2.5 px-3 rounded-xl bg-void-deep hover:bg-plasma-cyan/10 text-gray-300 hover:text-plasma-cyan border border-void-border hover:border-plasma-cyan/40 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer hover:scale-105 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-rup-emerald" />
                  <span className="text-xs text-rup-emerald font-semibold">{t("copiedLink")}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">{t("shareView")}</span>
                </>
              )}
            </button>
          </CosmicTooltip>
        )}
      </div>
    </div>
  );
}

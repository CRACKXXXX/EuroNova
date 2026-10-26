"use client";

import { Building, MapPin, Globe, Camera, Music, PlaySquare, Briefcase, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";
import { TermTooltip } from "@/components/TermTooltip";

export interface OrganizationData {
  id: string;
  org_name?: string | null;
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

  return (
    <div className="bg-void-surface border border-void-border rounded-2xl p-6 hover:border-hyper-violet/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] group/org flex flex-col h-full relative overflow-visible">
      <div className="flex items-start gap-4 mb-4">
        {/* Default Avatar Fallback or Actual Logo */}
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={org.org_name || "Organization"}
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-full object-cover border border-void-border bg-void-deep shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-void-surface to-plasma-cyan/20 border border-plasma-cyan/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.15)] group-hover/org:border-plasma-cyan/50 transition-colors">
            <Building className="w-6 h-6 text-plasma-cyan" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold text-white group-hover/org:text-hyper-violet transition-colors line-clamp-1">
              {org.org_name || t("unnamedOrg")}
            </h2>
            {org.verification_status === "verified" && (
              <span className="px-2 py-0.5 rounded-md bg-rup-emerald/10 border border-rup-emerald/30 text-[10px] font-bold text-rup-emerald uppercase tracking-wider shrink-0">
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
                  <Image src={c.flagUrl} alt={c.name} width={16} height={12} unoptimized className="w-4 h-auto rounded-[2px]" title={c.name} />
                  <span className="truncate">{c.name}</span>
                </span>
              ) : (
                <span className="text-sm text-gray-400 truncate">{org.country_hq}</span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* OID & PIC Badges with Tooltips if present */}
      {(picValue || oidValue) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {picValue && (
            <TermTooltip term="PIC">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-hyper-violet/15 border border-hyper-violet/30 text-hyper-violet uppercase tracking-wider">
                PIC: {picValue}
              </span>
            </TermTooltip>
          )}
          {oidValue && (
            <TermTooltip term="OID">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-plasma-cyan/15 border border-plasma-cyan/30 text-plasma-cyan uppercase tracking-wider">
                OID: {oidValue}
              </span>
            </TermTooltip>
          )}
        </div>
      )}

      <p className="text-sm text-gray-300 mb-6 flex-1 line-clamp-3">
        {org.description || t("noDescription")}
      </p>

      {hasAnyContact && (
        <div className="pt-4 border-t border-void-border flex flex-wrap items-center gap-3">
          {website && (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all"
              title={t("websiteTitle")}
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
          {instagram && (
            <a
              href={instagram.startsWith("http") ? instagram : `https://${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all"
              title={t("instagramTitle")}
            >
              <Camera className="w-4 h-4" />
            </a>
          )}
          {tiktok && (
            <a
              href={tiktok.startsWith("http") ? tiktok : `https://${tiktok}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all"
              title={t("tiktokTitle")}
            >
              <Music className="w-4 h-4" />
            </a>
          )}
          {youtube && (
            <a
              href={youtube.startsWith("http") ? youtube : `https://${youtube}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all"
              title={t("youtubeTitle")}
            >
              <PlaySquare className="w-4 h-4" />
            </a>
          )}
          {linkedin && (
            <a
              href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-void-deep border border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 hover:bg-plasma-cyan/10 transition-all"
              title={t("linkedinTitle")}
            >
              <Briefcase className="w-4 h-4" />
            </a>
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

      <div className="pt-4 mt-4 border-t border-void-border">
        <Link
          href={`/dashboard/organizations/${org.id}`}
          className="w-full py-2.5 rounded-lg bg-hyper-violet/10 hover:bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30 font-medium text-sm transition-all flex justify-center items-center gap-2 group-hover/org:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          <Building className="w-4 h-4" />
          <span>{t("viewProfile")}</span>
        </Link>
      </div>
    </div>
  );
}

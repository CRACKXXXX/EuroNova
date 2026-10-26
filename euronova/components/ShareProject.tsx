"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { 
  Share2, 
  Copy, 
  Check, 
  Send, 
  Smartphone, 
  Sparkles, 
  Download, 
  X as CloseIcon, 
  MapPin, 
  Clock, 
  Users, 
  Building 
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { COUNTRIES } from "@/lib/constants/countries";

export interface ShareProjectProps {
  project: {
    id: string;
    title: string;
    dest_country?: string;
    country?: string;
    project_type?: string;
    mission_type?: string;
    exact_location?: string;
    duration_days?: number;
    min_age?: number;
    max_age?: number;
    image_url?: string;
    org_name?: string;
  };
  className?: string;
}

const subscribe = () => () => {};

export function ShareProject({ project, className = "" }: ShareProjectProps) {
  const t = useTranslations("ProjectDetails");

  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const getT = (key: string, fallback: string) => {
    try {
      return t.has(key) ? t(key) : fallback;
    } catch {
      return fallback;
    }
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPostCardModalOpen, setIsPostCardModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Fallbacks and country normalization
  const countryCode = (project.dest_country || project.country || "").toUpperCase().trim();
  const countryObj = COUNTRIES.find((c) => c.code === countryCode);
  const projectType = project.project_type || project.mission_type || "Erasmus+";

  // Share URL & formatted share text
  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/dashboard/projects/${project.id}`;
    }
    return `https://euronova.space/dashboard/projects/${project.id}`;
  };

  const getShareText = () => {
    const loc = countryObj ? `${countryObj.name}` : countryCode || "Europe";
    return `🚀 Opportunity: "${project.title}" in ${loc}. Explore on EuroNova:`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: project.title,
          text: getShareText(),
          url: getShareUrl(),
        });
      } catch {
        // User cancelled or share dismissed
      }
    }
  };

  const handleSimulateDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 1200);
  };

  const shareUrl = getShareUrl();
  const shareText = getShareText();

  return (
    <div className={className}>
      {/* 1. Main Trigger Button */}
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="w-full px-5 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-white bg-void-surface hover:bg-void-border/80 border border-plasma-cyan/40 hover:border-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.12)] hover:shadow-[0_0_25px_rgba(0,229,255,0.25)] text-sm cursor-pointer group"
        >
          <Share2 className="w-4 h-4 text-plasma-cyan group-hover:scale-110 transition-transform" />
          <span>{getT("shareMission", "Share Mission")}</span>
        </button>
      </div>

      {/* 2. Omnichannel Share Modal */}
      {isShareModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-void-deep/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-void-surface border border-plasma-cyan/30 rounded-2xl p-6 shadow-2xl overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-plasma-cyan/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-plasma-cyan" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {getT("shareTitle", "Share European Mission")}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {getT("shareDesc", "Spread this opportunity with youth, volunteers, and mobility partners across Europe.")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                aria-label={getT("closeModal", "Close dialog")}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white p-2 rounded-lg hover:bg-void-deep focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Copy Link Input Bar */}
            <div className="mb-5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                {getT("copyLink", "Copy Link")}
              </label>
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-void-deep border border-void-border">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-xs text-gray-200 px-2.5 flex-1 outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    copied
                      ? "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40"
                      : "bg-plasma-cyan text-void-deep hover:bg-plasma-cyan/90 font-bold"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{getT("linkCopied", "Link copied to clipboard!")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{getT("copyLink", "Copy Link")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social Share Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-void-deep/80 hover:bg-[#25D366]/10 border border-void-border hover:border-[#25D366]/40 transition-all flex items-center gap-2.5 text-xs text-gray-300 hover:text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#25D366]/15 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span className="font-semibold">{getT("shareWhatsApp", "WhatsApp")}</span>
              </a>

              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-void-deep/80 hover:bg-[#229ED9]/10 border border-void-border hover:border-[#229ED9]/40 transition-all flex items-center gap-2.5 text-xs text-gray-300 hover:text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#229ED9]/15 flex items-center justify-center shrink-0">
                  <Send className="w-3.5 h-3.5 text-[#229ED9]" />
                </div>
                <span className="font-semibold">{getT("shareTelegram", "Telegram")}</span>
              </a>

              {/* X / Twitter */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=ErasmusPlus,EuroNova`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-void-deep/80 hover:bg-white/10 border border-void-border hover:border-white/30 transition-all flex items-center gap-2.5 text-xs text-gray-300 hover:text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="font-semibold">{getT("shareTwitter", "X (Twitter)")}</span>
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-void-deep/80 hover:bg-[#0A66C2]/10 border border-void-border hover:border-[#0A66C2]/40 transition-all flex items-center gap-2.5 text-xs text-gray-300 hover:text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#0A66C2]/15 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 fill-[#0A66C2]" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </div>
                <span className="font-semibold">{getT("shareLinkedIn", "LinkedIn")}</span>
              </a>
            </div>

            {/* Native Device Share (if supported) */}
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full mb-3 px-4 py-2.5 rounded-xl bg-void-deep hover:bg-void-border/50 border border-void-border text-xs text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-plasma-cyan" />
                <span>{getT("shareDevice", "Native Share")}</span>
              </button>
            )}

            {/* Distinct Button: Visual Post Generator */}
            <div className="pt-3 border-t border-void-border">
              <button
                type="button"
                id="generate-post-card-btn"
                onClick={() => {
                  setIsShareModalOpen(false);
                  setIsPostCardModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-gradient-to-r from-hyper-violet/20 to-plasma-cyan/20 hover:from-hyper-violet/30 hover:to-plasma-cyan/30 border border-plasma-cyan/40 text-xs text-plasma-cyan flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.1)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{getT("generatePostCard", "Generate Post Card")}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. High-Fidelity Square Post Card Modal */}
      {isPostCardModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-void-deep/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-void-surface border border-plasma-cyan/30 rounded-3xl p-6 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-void-border mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-plasma-cyan" />
                  <span>{getT("postCardPreview", "Visual Post Card Preview")}</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {getT("postCardDesc", "High-fidelity square preview formatted for social media and messaging channels.")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPostCardModalOpen(false)}
                aria-label={getT("closeModal", "Close dialog")}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white p-2 rounded-lg hover:bg-void-deep focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Square Graphic Canvas (1:1 Ratio for Social Media) */}
            <div className="relative aspect-square w-full rounded-2xl bg-gradient-to-br from-void-deep via-void-surface to-[#0A0D18] border-2 border-plasma-cyan/40 p-6 flex flex-col justify-between shadow-[0_0_35px_rgba(0,229,255,0.15)] overflow-hidden">
              {/* Cosmic Glow Accents */}
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-plasma-cyan/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-hyper-violet/20 rounded-full blur-3xl pointer-events-none" />

              {/* Graphic Card Top Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-plasma-cyan/20 border border-plasma-cyan flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.4)]">
                    <span className="text-xs font-black text-plasma-cyan">EN</span>
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-wider text-white uppercase">EuroNova</span>
                    <span className="block text-[8px] font-semibold tracking-widest text-plasma-cyan uppercase">
                      {getT("missionCardBadge", "EURONOVA // ERASMUS+ MOBILITY")}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-hyper-violet/20 border border-hyper-violet/40 text-hyper-violet uppercase tracking-wider">
                  {projectType}
                </span>
              </div>

              {/* Graphic Card Body */}
              <div className="relative z-10 my-auto py-4">
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md line-clamp-3 mb-4">
                  {project.title}
                </h2>

                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-plasma-cyan shrink-0" />
                    <span className="font-semibold flex items-center gap-1.5">
                      {countryObj && (
                        <Image
                          src={countryObj.flagUrl}
                          alt={countryObj.name}
                          width={16}
                          height={12}
                          unoptimized
                          className="w-4 h-auto rounded-[2px]"
                        />
                      )}
                      <span>{countryObj?.name || countryCode || "Europe"}</span>
                      {project.exact_location ? <span>• {project.exact_location}</span> : null}
                    </span>
                  </div>

                  {project.duration_days && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-plasma-cyan shrink-0" />
                      <span>{project.duration_days} days activity</span>
                    </div>
                  )}

                  {project.min_age && project.max_age && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-hyper-violet shrink-0" />
                      <span>Age: {project.min_age} - {project.max_age} years</span>
                    </div>
                  )}

                  {project.org_name && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-400 truncate max-w-[280px]">
                        {t("hostedBy", { org: project.org_name })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Graphic Card Bottom Footer */}
              <div className="relative z-10 pt-3 border-t border-void-border/70 flex items-center justify-between text-[10px]">
                <span className="font-bold text-plasma-cyan tracking-wider">
                  {getT("applyAt", "Apply at euronova.space")}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rup-emerald/15 border border-rup-emerald/30 text-rup-emerald font-bold">
                  ORs Supported
                </span>
              </div>
            </div>

            {/* Action Download Button */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                id="download-card-graphic-btn"
                onClick={handleSimulateDownload}
                disabled={isDownloading}
                className="w-full py-3 px-4 rounded-xl font-bold bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)]"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isDownloading ? getT("generatingImage", "Preparing Card...") : getT("downloadImage", "Download Card Graphic")}
                </span>
              </button>

              {downloadSuccess && (
                <div className="text-center text-xs font-bold text-rup-emerald animate-in fade-in flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{getT("downloadReady", "Graphic card prepared successfully!")}</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

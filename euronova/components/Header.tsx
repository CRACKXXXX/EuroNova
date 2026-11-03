"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { 
  Home,
  Compass,
  Building,
  Briefcase,
  PlusCircle, 
  Menu, 
  X, 
  ShieldAlert,
  ShieldCheck,
  Headphones,
  Map as MapIcon,
  Users,
  Globe
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { UserLevelBadge } from "@/components/UserLevelBadge";
import { PassiveXpTracker } from "@/components/PassiveXpTracker";
import { NotificationBell } from "@/components/NotificationBell";
import { CosmicTooltip } from "@/components/CosmicTooltip";
import { calculateLevelFromXp } from "@/lib/gamification";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { type UserRole } from "@/lib/roles";
import { AvatarFallback } from "@/components/AvatarFallback";

export function Header({ 
  role, 
  isAdmin, 
  staffRole: propStaffRole,
  orgId: propOrgId 
}: { 
  role: "youth" | "org"; 
  isAdmin?: boolean; 
  staffRole?: UserRole;
  orgId?: string | null; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() || "";
  const locale = useLocale();
  const t = useTranslations("Header");
  const tCommon = useTranslations("Common");
  const [detectedOrgId, setDetectedOrgId] = useState<string | null>(propOrgId ?? null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [youthXp, setYouthXp] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<UserRole>(propStaffRole || (isAdmin ? "admin" : "user"));

  // Active navigation state calculations
  const isHomeActive = pathname === `/${locale}/dashboard` || pathname === "/dashboard";
  const isProjectsActive = pathname.startsWith(`/${locale}/dashboard/projects`) || pathname.startsWith("/dashboard/projects");
  const isOrgsActive = pathname.startsWith(`/${locale}/dashboard/organizations`) || pathname.startsWith("/dashboard/organizations");
  const isMissionsActive = pathname.startsWith(`/${locale}/dashboard/my-missions`) || pathname.startsWith("/dashboard/my-missions");
  const isCommunityActive = pathname.startsWith(`/${locale}/community`) || pathname.startsWith("/community");
  const isMapActive = pathname.startsWith(`/${locale}/map`) || pathname.startsWith("/map");
  const isEcosystemActive = pathname.startsWith(`/${locale}/ecosystem`) || pathname.startsWith("/ecosystem");

  // Automatically dismiss menus on route changes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Lock body scroll while mobile drawer is open, and release safely on close or unmount
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Detectar id de usuario, organización y avatar desde Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url as string);
        }

        if (role === "org") {
          const { data } = await supabase
            .from("users_org")
            .select("id, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (data?.id) {
            setDetectedOrgId(data.id);
          }
          if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        } else {
          // Obtener XP real del voluntario, avatar y rol para mostrar panel correspondiente
          const { data: youth } = await supabase
            .from("users_youth")
            .select("xp, avatar_url, role")
            .eq("id", user.id)
            .maybeSingle();
          if (youth && typeof youth.xp === "number") {
            setYouthXp(youth.xp);
          }
          if (youth?.avatar_url) {
            setAvatarUrl(youth.avatar_url);
          }
          if (youth?.role) {
            setStaffRole(youth.role as UserRole);
          }
        }
      }
    });

    // Escuchar actualizaciones dinámicas de XP en vivo
    const handleXpUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ xpGained?: number }>;
      if (customEvent.detail?.xpGained) {
        setYouthXp((prev) => prev + (customEvent.detail.xpGained || 0));
      }
    };
    window.addEventListener("euronova:xp-updated", handleXpUpdate);
    return () => window.removeEventListener("euronova:xp-updated", handleXpUpdate);
  }, [role, propOrgId]);

  const youthLevel = calculateLevelFromXp(youthXp);
  const isOrg = role === "org" && Boolean(detectedOrgId || propOrgId);
  const orgOrProfileHref = isOrg && (detectedOrgId || propOrgId)
    ? `/${locale}/dashboard/organizations/${detectedOrgId || propOrgId}`
    : isOrg
    ? `/${locale}/dashboard/organizations`
    : `/${locale}/dashboard/profile`;

  // Cerrar al pulsar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isOpen) setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <header className={`fixed top-0 left-0 right-0 h-16 bg-void-deep/90 backdrop-blur-md border-b border-void-border transition-colors ${isOpen ? "z-[9999]" : "z-40"}`}>
      <PassiveXpTracker userId={currentUserId} role={role} />
      <div className="w-full max-w-[1600px] mx-auto h-full flex justify-between items-center px-3 sm:px-4 xl:px-6">
        {/* Left: Logo & Desktop Navigation Spaced Out */}
        <div className="flex items-center gap-2 xl:gap-3 2xl:gap-4 min-w-0 flex-nowrap shrink-0">
          {/* Logo */}
          <Link
            href={`/${locale}/dashboard`}
            onClick={() => setIsOpen(false)}
            aria-label={t("home") || "EuroNova"}
            className="flex items-center group shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none"
          >
            {/* Desktop Logo */}
            <div className="hidden sm:block">
              <Image
                src="/logo-big.png"
                alt={tCommon("logoAlt")}
                width={120}
                height={32}
                priority
                sizes="120px"
                style={{ width: "auto", height: "auto" }}
                className="h-7.5 xl:h-8 w-auto object-contain rounded-md group-hover:scale-105 transition-transform"
              />
            </div>
            {/* Mobile / Compact Logo */}
            <div className="block sm:hidden">
              <Image
                src="/logo-small.png"
                alt={tCommon("logoAlt")}
                width={34}
                height={34}
                priority
                sizes="34px"
                style={{ width: "auto", height: "auto" }}
                className="h-8 w-auto object-contain rounded-md group-hover:scale-110 transition-transform"
              />
            </div>
          </Link>

          {/* Desktop Navigation Links - Viewport-aware Cosmic Tooltips */}
          <nav className="hidden xl:flex items-center gap-0.5 min-[1380px]:gap-1 2xl:gap-2 flex-nowrap shrink-0 whitespace-nowrap">
            <CosmicTooltip content={t("home")} side="bottom">
              <Link
                href={`/${locale}/dashboard`}
                aria-label={t("home")}
                className={`flex items-center gap-1 2xl:gap-1.5 text-[11px] min-[1380px]:text-xs 2xl:text-[13px] px-1.5 min-[1380px]:px-2 py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                  isHomeActive
                    ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
                }`}
              >
                <Home className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 transition-colors ${isHomeActive ? "text-plasma-cyan" : ""}`} />
                <span>{t("home")}</span>
              </Link>
            </CosmicTooltip>

            <CosmicTooltip content={t("searchProjects")} side="bottom">
              <Link
                href={`/${locale}/dashboard/projects`}
                aria-label={t("searchProjects")}
                className={`flex items-center gap-1 2xl:gap-1.5 text-[11px] min-[1380px]:text-xs 2xl:text-[13px] px-1.5 min-[1380px]:px-2 py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                  isProjectsActive
                    ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
                }`}
              >
                <Compass className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 transition-colors ${isProjectsActive ? "text-plasma-cyan" : ""}`} />
                <span>{t("searchProjects")}</span>
              </Link>
            </CosmicTooltip>

            <CosmicTooltip content={t("searchOrgs")} side="bottom">
              <Link
                href={`/${locale}/dashboard/organizations`}
                aria-label={t("searchOrgs")}
                className={`flex items-center gap-1 2xl:gap-1.5 text-[11px] min-[1380px]:text-xs 2xl:text-[13px] px-1.5 min-[1380px]:px-2 py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                  isOrgsActive
                    ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
                }`}
              >
                <Building className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 transition-colors ${isOrgsActive ? "text-plasma-cyan" : ""}`} />
                <span>{t("searchOrgs")}</span>
              </Link>
            </CosmicTooltip>

            <CosmicTooltip content={t("myMissions")} side="bottom">
              <Link
                href={`/${locale}/dashboard/my-missions`}
                aria-label={t("myMissions")}
                className={`flex items-center gap-1 2xl:gap-1.5 text-[11px] min-[1380px]:text-xs 2xl:text-[13px] px-1.5 min-[1380px]:px-2 py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                  isMissionsActive
                    ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
                }`}
              >
                <Briefcase className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 transition-colors ${isMissionsActive ? "text-plasma-cyan" : ""}`} />
                <span>{t("myMissions")}</span>
              </Link>
            </CosmicTooltip>

            <CosmicTooltip content={t("community")} side="bottom">
              <Link
                href={`/${locale}/community`}
                aria-label={t("community")}
                className={`flex items-center gap-1 2xl:gap-1.5 text-[11px] min-[1380px]:text-xs 2xl:text-[13px] px-1.5 min-[1380px]:px-2 py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent group ${
                  isCommunityActive
                    ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
                }`}
              >
                <Users className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 transition-colors ${isCommunityActive ? "text-plasma-cyan" : "text-gray-400 group-hover:text-plasma-cyan"}`} />
                <span>{t("community")}</span>
              </Link>
            </CosmicTooltip>

            <CosmicTooltip content={t("map")} side="bottom">
              <Link
                href={`/${locale}/map`}
                aria-label={t("map")}
                className={`flex items-center gap-1 2xl:gap-1.5 text-[11px] min-[1380px]:text-xs 2xl:text-[13px] px-1.5 min-[1380px]:px-2 py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent group ${
                  isMapActive
                    ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
                }`}
              >
                <MapIcon className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 transition-colors ${isMapActive ? "text-plasma-cyan" : "text-gray-400 group-hover:text-plasma-cyan"}`} />
                <span>{t("map")}</span>
              </Link>
            </CosmicTooltip>

            <CosmicTooltip content={t("ecosystem")} side="bottom">
              <Link
                href={`/${locale}/ecosystem`}
                aria-label={t("ecosystem")}
                className={`flex items-center gap-1 2xl:gap-1.5 text-[11px] min-[1380px]:text-xs 2xl:text-[13px] px-1.5 min-[1380px]:px-2 py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent group ${
                  isEcosystemActive
                    ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
                }`}
              >
                <Globe className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 transition-colors ${isEcosystemActive ? "text-plasma-cyan" : "text-gray-400 group-hover:text-plasma-cyan"}`} />
                <span>{t("ecosystem")}</span>
              </Link>
            </CosmicTooltip>
          </nav>
        </div>

        {/* Desktop Actions / Auth - Strict single line with comfortable spacing */}
        <div className="hidden xl:flex items-center gap-1.5 xl:gap-2 2xl:gap-2.5 shrink-0 flex-nowrap ml-2 xl:ml-3">
          {/* Language Selector */}
          <div className="shrink-0 flex items-center">
            <LanguageSwitcher />
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Clean Elegant Icon Button: Publish Mission (For NGOs/Organizations) */}
          {isOrg && (
            <CosmicTooltip content={t("publish")} side="bottom">
              <Link
                href={`/${locale}/dashboard/projects/new`}
                aria-label={t("publish")}
                className="p-1.5 2xl:p-2 rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30 hover:border-plasma-cyan transition-all shrink-0 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.15)]"
              >
                <PlusCircle className="w-4 h-4" />
              </Link>
            </CosmicTooltip>
          )}

          {/* Moderator Panel Link (Strictly for moderator role only) */}
          {staffRole === "moderator" && (
            <CosmicTooltip content={t("moderatorPanel")} side="bottom">
              <Link
                href={`/${locale}/dashboard/moderator-panel`}
                aria-label={t("moderatorPanel")}
                className="p-1.5 2xl:p-2 min-w-[38px] min-h-[38px] rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400 focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-all shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
            </CosmicTooltip>
          )}

          {/* Support Panel Link (Strictly for support role only) */}
          {staffRole === "support" && (
            <CosmicTooltip content={t("supportPanel")} side="bottom">
              <Link
                href={`/${locale}/dashboard/support-panel`}
                aria-label={t("supportPanel")}
                className="p-1.5 2xl:p-2 min-w-[38px] min-h-[38px] rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30 hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-all shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.15)]"
              >
                <Headphones className="w-4 h-4" />
              </Link>
            </CosmicTooltip>
          )}

          {/* Clean Elegant Icon Button: Admin Shield (For admin and root) */}
          {(isAdmin || staffRole === "admin" || staffRole === "root") && (
            <CosmicTooltip content={t("adminPanel")} side="bottom">
              <Link
                href={`/${locale}/dashboard/admin`}
                aria-label={t("adminPanel")}
                className="p-1.5 2xl:p-2 min-w-[38px] min-h-[38px] rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 hover:border-nova-flare focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none transition-all shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(255,46,99,0.15)]"
              >
                <ShieldAlert className="w-4 h-4" />
              </Link>
            </CosmicTooltip>
          )}

          {/* Botón My Organization / My Profile con avatar dinámico y CosmicTooltip */}
          <CosmicTooltip content={isOrg ? t("myOrg") : t("myProfile")} side="bottom">
            <Link
              href={orgOrProfileHref}
              aria-label={isOrg ? t("myOrg") : t("myProfile")}
              className="flex items-center gap-1.5 px-2 py-1.5 min-h-[38px] rounded-lg bg-transparent hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/30 focus-visible:ring-2 focus-visible:ring-hyper-violet focus-visible:outline-none text-gray-300 hover:text-hyper-violet transition-all text-xs font-semibold shrink-0 whitespace-nowrap"
            >
              <AvatarFallback
                src={avatarUrl}
                alt={isOrg ? "Organization Logo" : "Profile Picture"}
                fallbackType={isOrg ? "org" : "user"}
                sizeClassName="w-7 h-7"
              />
              <span className="hidden min-[1700px]:inline max-w-[100px] truncate">{isOrg ? t("myOrg") : t("myProfile")}</span>
              {!isOrg && <UserLevelBadge level={youthLevel} size="sm" />}
            </Link>
          </CosmicTooltip>

          <div className="shrink-0 flex items-center">
            <LogoutButton variant="icon" />
          </div>
        </div>

        {/* Mobile / Tablet Hamburger Toggle */}
        <div className="flex items-center gap-2 xl:hidden">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls="mobile-menu-drawer"
            className="min-w-[44px] min-h-[44px] p-2 rounded-lg border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer flex items-center justify-center"
            aria-label={isOpen ? t("closeMenu") : t("toggleMenu")}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* True Full-Screen Mobile Overlay */}
      {isOpen && (
        <div
          id="mobile-menu-drawer"
          style={{ backgroundColor: "#050508" }}
          className="fixed inset-0 z-[9999] flex flex-col h-[100dvh] w-full backdrop-blur-3xl overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 animate-in fade-in duration-200"
        >
          {/* Top Bar: Brand & Close Button */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto shrink-0 pb-4 border-b border-void-border/30">
            <Link
              href={`/${locale}/dashboard`}
              onClick={() => setIsOpen(false)}
              aria-label={t("home")}
              className="flex items-center group shrink-0 min-h-[44px] min-w-[44px] rounded-lg focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none"
            >
              <Image
                src="/logo-big.png"
                alt={tCommon("logoAlt")}
                width={130}
                height={35}
                sizes="130px"
                style={{ width: "auto", height: "auto" }}
                className="h-8 w-auto object-contain rounded-md group-hover:scale-105 transition-transform"
              />
            </Link>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-full border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer flex items-center justify-center"
              aria-label={t("closeMenu")}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links - Scrollable without negative scroll bounds */}
          <nav className="flex-1 flex flex-col items-center justify-start gap-3.5 sm:gap-4 py-6 text-center w-full max-w-md mx-auto">
            <Link
              href={`/${locale}/dashboard`}
              onClick={() => setIsOpen(false)}
              className={`w-full py-2 text-lg sm:text-xl md:text-2xl tracking-tight transition-all flex items-center justify-center gap-3 group rounded-xl ${
                isHomeActive ? "font-black text-plasma-cyan bg-plasma-cyan/10" : "font-semibold text-gray-300 hover:text-plasma-cyan hover:bg-void-surface"
              }`}
            >
              <Home className={`w-5 h-5 shrink-0 transition-colors ${isHomeActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span className="truncate">{t("home")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/projects`}
              onClick={() => setIsOpen(false)}
              className={`w-full py-2 text-lg sm:text-xl md:text-2xl tracking-tight transition-all flex items-center justify-center gap-3 group rounded-xl ${
                isProjectsActive ? "font-black text-plasma-cyan bg-plasma-cyan/10" : "font-semibold text-gray-300 hover:text-plasma-cyan hover:bg-void-surface"
              }`}
            >
              <Compass className={`w-5 h-5 shrink-0 transition-colors ${isProjectsActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span className="truncate">{t("searchProjects")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/organizations`}
              onClick={() => setIsOpen(false)}
              className={`w-full py-2 text-lg sm:text-xl md:text-2xl tracking-tight transition-all flex items-center justify-center gap-3 group rounded-xl ${
                isOrgsActive ? "font-black text-plasma-cyan bg-plasma-cyan/10" : "font-semibold text-gray-300 hover:text-plasma-cyan hover:bg-void-surface"
              }`}
            >
              <Building className={`w-5 h-5 shrink-0 transition-colors ${isOrgsActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span className="truncate">{t("searchOrgs")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/my-missions`}
              onClick={() => setIsOpen(false)}
              className={`w-full py-2 text-lg sm:text-xl md:text-2xl tracking-tight transition-all flex items-center justify-center gap-3 group rounded-xl ${
                isMissionsActive ? "font-black text-plasma-cyan bg-plasma-cyan/10" : "font-semibold text-gray-300 hover:text-plasma-cyan hover:bg-void-surface"
              }`}
            >
              <Briefcase className={`w-5 h-5 shrink-0 transition-colors ${isMissionsActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span className="truncate">{t("myMissions")}</span>
            </Link>

            <Link
              href={`/${locale}/community`}
              onClick={() => setIsOpen(false)}
              className={`w-full py-2 text-lg sm:text-xl md:text-2xl tracking-tight transition-all flex items-center justify-center gap-3 group rounded-xl ${
                isCommunityActive ? "font-black text-plasma-cyan bg-plasma-cyan/10" : "font-semibold text-gray-300 hover:text-plasma-cyan hover:bg-void-surface"
              }`}
            >
              <Users className={`w-5 h-5 shrink-0 transition-colors ${isCommunityActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span className="truncate">{t("community")}</span>
            </Link>

            <Link
              href={`/${locale}/map`}
              onClick={() => setIsOpen(false)}
              className={`w-full py-2 text-lg sm:text-xl md:text-2xl tracking-tight transition-all flex items-center justify-center gap-3 group rounded-xl ${
                isMapActive ? "font-black text-plasma-cyan bg-plasma-cyan/10" : "font-semibold text-gray-300 hover:text-plasma-cyan hover:bg-void-surface"
              }`}
            >
              <MapIcon className={`w-5 h-5 shrink-0 transition-colors ${isMapActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span className="truncate">{t("map")}</span>
            </Link>

            <Link
              href={`/${locale}/ecosystem`}
              onClick={() => setIsOpen(false)}
              className={`w-full py-2 text-lg sm:text-xl md:text-2xl tracking-tight transition-all flex items-center justify-center gap-3 group rounded-xl ${
                isEcosystemActive ? "font-black text-plasma-cyan bg-plasma-cyan/10" : "font-semibold text-gray-300 hover:text-plasma-cyan hover:bg-void-surface"
              }`}
            >
              <Globe className={`w-5 h-5 shrink-0 transition-colors ${isEcosystemActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span className="truncate">{t("ecosystem")}</span>
            </Link>

            {/* Role specific mobile action links */}
            {isOrg && (
              <Link
                href={`/${locale}/dashboard/projects/new`}
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-base sm:text-lg font-bold tracking-tight text-plasma-cyan hover:bg-plasma-cyan/10 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5 shrink-0" />
                <span>{t("publish")}</span>
              </Link>
            )}

            {staffRole === "moderator" && (
              <Link
                href={`/${locale}/dashboard/moderator-panel`}
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-base sm:text-lg font-bold tracking-tight text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>{t("moderatorPanel")}</span>
              </Link>
            )}

            {staffRole === "support" && (
              <Link
                href={`/${locale}/dashboard/support-panel`}
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-base sm:text-lg font-bold tracking-tight text-plasma-cyan hover:bg-plasma-cyan/10 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Headphones className="w-5 h-5 shrink-0" />
                <span>{t("supportPanel")}</span>
              </Link>
            )}

            {(isAdmin || staffRole === "admin" || staffRole === "root") && (
              <Link
                href={`/${locale}/dashboard/admin`}
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-base sm:text-lg font-bold tracking-tight text-nova-flare hover:bg-nova-flare/10 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{t("adminPanel")}</span>
              </Link>
            )}
          </nav>

          {/* Bottom Area: Language Switcher, Profile, and Logout */}
          <div className="pb-6 pt-4 flex flex-col items-center gap-4 w-full max-w-sm mx-auto shrink-0 border-t border-void-border/40">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                {t("language")}
              </span>
              <LanguageSwitcher />
            </div>

            <div className="flex items-center gap-3 w-full justify-center">
              <Link
                href={orgOrProfileHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/50 text-gray-300 hover:text-hyper-violet transition-all text-xs sm:text-sm font-semibold truncate max-w-[200px]"
              >
                <AvatarFallback
                  src={avatarUrl}
                  alt={isOrg ? "Organization Logo" : "Profile Picture"}
                  fallbackType={isOrg ? "org" : "user"}
                  sizeClassName="w-7 h-7 shrink-0"
                />
                <span className="truncate">{isOrg ? t("myOrg") : t("myProfile")}</span>
                {!isOrg && <UserLevelBadge level={youthLevel} size="sm" />}
              </Link>

              <LogoutButton variant="full" onClickExtra={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

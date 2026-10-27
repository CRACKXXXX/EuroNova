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
  Users
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { UserLevelBadge } from "@/components/UserLevelBadge";
import { PassiveXpTracker } from "@/components/PassiveXpTracker";
import { NotificationBell } from "@/components/NotificationBell";
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

  // Automatically dismiss mobile menu on route changes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Lock body scroll while mobile drawer is open, and release safely on close or unmount
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow || "";
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
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-void-deep/90 backdrop-blur-md border-b border-void-border z-40">
      <PassiveXpTracker userId={currentUserId} role={role} />
      <div className="max-w-7xl mx-auto h-full flex justify-between items-center w-full px-4 md:px-8">
        {/* Left: Logo & Desktop Navigation Spaced Out */}
        <div className="flex items-center gap-6 xl:gap-8 min-w-0 flex-nowrap shrink-0">
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
                width={140}
                height={38}
                priority
                sizes="140px"
                style={{ width: "auto", height: "auto" }}
                className="h-9 w-auto object-contain rounded-md group-hover:scale-105 transition-transform"
              />
            </div>
            {/* Mobile / Compact Logo */}
            <div className="block sm:hidden">
              <Image
                src="/logo-small.png"
                alt={tCommon("logoAlt")}
                width={36}
                height={36}
                priority
                sizes="36px"
                style={{ width: "auto", height: "auto" }}
                className="h-8 sm:h-9 w-auto object-contain rounded-md group-hover:scale-110 transition-transform"
              />
            </div>
          </Link>

          {/* Desktop Navigation Links - Strict single line with active indicators */}
          <nav className="hidden xl:flex items-center gap-4 2xl:gap-6 flex-nowrap shrink-0 whitespace-nowrap">
            <Link
              href={`/${locale}/dashboard`}
              className={`flex items-center gap-1.5 text-sm py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                isHomeActive
                  ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                  : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
              }`}
            >
              <Home className={`w-4 h-4 transition-colors ${isHomeActive ? "text-plasma-cyan" : ""}`} />
              <span>{t("home")}</span>
            </Link>
            <Link
              href={`/${locale}/dashboard/projects`}
              className={`flex items-center gap-1.5 text-sm py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                isProjectsActive
                  ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                  : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
              }`}
            >
              <Compass className={`w-4 h-4 transition-colors ${isProjectsActive ? "text-plasma-cyan" : ""}`} />
              <span>{t("searchProjects")}</span>
            </Link>
            <Link
              href={`/${locale}/dashboard/organizations`}
              className={`flex items-center gap-1.5 text-sm py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                isOrgsActive
                  ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                  : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
              }`}
            >
              <Building className={`w-4 h-4 transition-colors ${isOrgsActive ? "text-plasma-cyan" : ""}`} />
              <span>{t("searchOrgs")}</span>
            </Link>
            <Link
              href={`/${locale}/dashboard/my-missions`}
              className={`flex items-center gap-1.5 text-sm py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                isMissionsActive
                  ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                  : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
              }`}
            >
              <Briefcase className={`w-4 h-4 transition-colors ${isMissionsActive ? "text-plasma-cyan" : ""}`} />
              <span>{t("myMissions")}</span>
            </Link>
            <Link
              href={`/${locale}/community`}
              className={`flex items-center gap-1.5 text-sm py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                isCommunityActive
                  ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                  : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
              }`}
            >
              <Users className={`w-4 h-4 transition-colors ${isCommunityActive ? "text-plasma-cyan" : ""}`} />
              <span>{t("community")}</span>
            </Link>
            <Link
              href={`/${locale}/map`}
              className={`flex items-center gap-1.5 text-sm py-1 transition-all whitespace-nowrap shrink-0 border-b-2 bg-transparent ${
                isMapActive
                  ? "font-bold text-plasma-cyan border-plasma-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                  : "font-medium text-gray-300 hover:text-plasma-cyan border-transparent hover:border-plasma-cyan/60"
              }`}
            >
              <MapIcon className={`w-4 h-4 transition-colors ${isMapActive ? "text-plasma-cyan" : ""}`} />
              <span>{t("map")}</span>
            </Link>
          </nav>
        </div>

        {/* Desktop Actions / Auth - Strict single line with comfortable spacing */}
        <div className="hidden xl:flex items-center gap-3 2xl:gap-3.5 shrink-0 flex-nowrap ml-8 2xl:ml-12">
          {/* Language Selector */}
          <div className="shrink-0 flex items-center">
            <LanguageSwitcher />
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Clean Elegant Icon Button: Publish Mission (For NGOs/Organizations) */}
          {isOrg && (
            <Link
              href={`/${locale}/dashboard/projects/new`}
              title={t("publish")}
              aria-label={t("publish")}
              className="p-2 rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30 hover:border-plasma-cyan transition-all shrink-0 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.15)]"
            >
              <PlusCircle className="w-4 h-4" />
            </Link>
          )}

          {/* Moderator Panel Link */}
          {staffRole === "moderator" && (
            <Link
              href={`/${locale}/dashboard/moderator-panel`}
              title={t("moderatorPanel")}
              aria-label={t("moderatorPanel")}
              className="p-2 min-w-[44px] min-h-[44px] rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400 focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-all shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            >
              <ShieldCheck className="w-4 h-4" />
            </Link>
          )}

          {/* Support Panel Link */}
          {staffRole === "support" && (
            <Link
              href={`/${locale}/dashboard/support-panel`}
              title={t("supportPanel")}
              aria-label={t("supportPanel")}
              className="p-2 min-w-[44px] min-h-[44px] rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30 hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-all shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.15)]"
            >
              <Headphones className="w-4 h-4" />
            </Link>
          )}

          {/* Clean Elegant Icon Button: Admin Shield (For admin and root) */}
          {(isAdmin || staffRole === "admin" || staffRole === "root") && (
            <Link
              href={`/${locale}/dashboard/admin`}
              title={t("adminPanel")}
              aria-label={t("adminPanel")}
              className="p-2 min-w-[44px] min-h-[44px] rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 hover:border-nova-flare focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none transition-all shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(255,46,99,0.15)]"
            >
              <ShieldAlert className="w-4 h-4" />
            </Link>
          )}

          {/* Botón My Organization / My Profile con avatar dinámico y fallback a prueba de fallos */}
          <Link
            href={orgOrProfileHref}
            className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-lg bg-transparent hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/30 focus-visible:ring-2 focus-visible:ring-hyper-violet focus-visible:outline-none text-gray-300 hover:text-hyper-violet transition-all text-xs 2xl:text-sm font-semibold shrink-0 whitespace-nowrap"
          >
            <AvatarFallback
              src={avatarUrl}
              alt={isOrg ? "Organization Logo" : "Profile Picture"}
              fallbackType={isOrg ? "org" : "user"}
              sizeClassName="w-8 h-8"
            />
            <span>{isOrg ? t("myOrg") : t("myProfile")}</span>
            {!isOrg && <UserLevelBadge level={youthLevel} size="sm" />}
          </Link>

          <div className="shrink-0 flex items-center">
            <LogoutButton variant="icon" />
          </div>
        </div>

        {/* Mobile / Tablet Hamburger Toggle */}
        <div className="flex items-center gap-2 xl:hidden">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="min-w-[44px] min-h-[44px] p-2 rounded-lg border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer flex items-center justify-center"
            aria-label={t("toggleMenu")}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* True Full-Screen Mobile Overlay */}
      {isOpen && (
        <div
          style={{ backgroundColor: "#050508" }}
          className="fixed inset-0 z-[9999] flex flex-col min-h-screen w-screen backdrop-blur-3xl overflow-y-auto p-6 sm:p-8 animate-in fade-in duration-200"
        >
          {/* Top Bar: Brand & Close Button */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto shrink-0 pb-4">
            <Link
              href={`/${locale}/dashboard`}
              onClick={() => setIsOpen(false)}
              aria-label={t("home")}
              className="flex items-center group shrink-0 min-h-[44px] min-w-[44px] rounded-lg focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none"
            >
              <Image
                src="/logo-big.png"
                alt={tCommon("logoAlt")}
                width={140}
                height={38}
                sizes="140px"
                style={{ width: "auto", height: "auto" }}
                className="h-9 w-auto object-contain rounded-md group-hover:scale-105 transition-transform"
              />
            </Link>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-full border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer flex items-center justify-center"
              aria-label={t("closeMenu")}
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 flex flex-col items-center justify-center gap-7 my-auto py-8 text-center">
            <Link
              href={`/${locale}/dashboard`}
              onClick={() => setIsOpen(false)}
              className={`text-2xl sm:text-3xl tracking-tight transition-all flex items-center gap-3.5 group ${
                isHomeActive ? "font-black text-plasma-cyan" : "font-extrabold text-gray-300 hover:text-plasma-cyan"
              }`}
            >
              <Home className={`w-6 h-6 transition-colors ${isHomeActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span>{t("home")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/projects`}
              onClick={() => setIsOpen(false)}
              className={`text-2xl sm:text-3xl tracking-tight transition-all flex items-center gap-3.5 group ${
                isProjectsActive ? "font-black text-plasma-cyan" : "font-extrabold text-gray-300 hover:text-plasma-cyan"
              }`}
            >
              <Compass className={`w-6 h-6 transition-colors ${isProjectsActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span>{t("searchProjects")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/organizations`}
              onClick={() => setIsOpen(false)}
              className={`text-2xl sm:text-3xl tracking-tight transition-all flex items-center gap-3.5 group ${
                isOrgsActive ? "font-black text-plasma-cyan" : "font-extrabold text-gray-300 hover:text-plasma-cyan"
              }`}
            >
              <Building className={`w-6 h-6 transition-colors ${isOrgsActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span>{t("searchOrgs")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/my-missions`}
              onClick={() => setIsOpen(false)}
              className={`text-2xl sm:text-3xl tracking-tight transition-all flex items-center gap-3.5 group ${
                isMissionsActive ? "font-black text-plasma-cyan" : "font-extrabold text-gray-300 hover:text-plasma-cyan"
              }`}
            >
              <Briefcase className={`w-6 h-6 transition-colors ${isMissionsActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span>{t("myMissions")}</span>
            </Link>

            <Link
              href={`/${locale}/community`}
              onClick={() => setIsOpen(false)}
              className={`text-2xl sm:text-3xl tracking-tight transition-all flex items-center gap-3.5 group ${
                isCommunityActive ? "font-black text-plasma-cyan" : "font-extrabold text-gray-300 hover:text-plasma-cyan"
              }`}
            >
              <Users className={`w-6 h-6 transition-colors ${isCommunityActive ? "text-plasma-cyan" : "text-gray-500 group-hover:text-plasma-cyan"}`} />
              <span>{t("community")}</span>
            </Link>

            <Link
              href={`/${locale}/map`}
              onClick={() => setIsOpen(false)}
              className={`text-2xl sm:text-3xl tracking-tight transition-all flex items-center gap-3.5 group ${
                isMapActive ? "font-black text-plasma-cyan" : "font-extrabold text-gray-300 hover:text-plasma-cyan"
              }`}
            >
              <MapIcon className="w-6 h-6 text-plasma-cyan transition-colors" />
              <span>{t("map")}</span>
            </Link>

            {isOrg && (
              <Link
                href={`/${locale}/dashboard/projects/new`}
                onClick={() => setIsOpen(false)}
                className="text-xl sm:text-2xl font-bold tracking-tight text-plasma-cyan hover:scale-105 transition-all flex items-center gap-2.5"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{t("publish")}</span>
              </Link>
            )}

            {staffRole === "moderator" && (
              <Link
                href={`/${locale}/dashboard/moderator-panel`}
                onClick={() => setIsOpen(false)}
                className="text-xl sm:text-2xl font-bold tracking-tight text-amber-400 hover:scale-105 transition-all flex items-center gap-2.5"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{t("moderatorPanel")}</span>
              </Link>
            )}

            {staffRole === "support" && (
              <Link
                href={`/${locale}/dashboard/support-panel`}
                onClick={() => setIsOpen(false)}
                className="text-xl sm:text-2xl font-bold tracking-tight text-plasma-cyan hover:scale-105 transition-all flex items-center gap-2.5"
              >
                <Headphones className="w-5 h-5" />
                <span>{t("supportPanel")}</span>
              </Link>
            )}

            {(isAdmin || staffRole === "admin" || staffRole === "root") && (
              <Link
                href={`/${locale}/dashboard/admin`}
                onClick={() => setIsOpen(false)}
                className="text-xl sm:text-2xl font-bold tracking-tight text-nova-flare hover:scale-105 transition-all flex items-center gap-2.5"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>{t("adminPanel")}</span>
              </Link>
            )}
          </nav>

          {/* Bottom Area: Language Switcher, Profile, and Logout */}
          <div className="pb-8 pt-4 flex flex-col items-center gap-5 w-full max-w-sm mx-auto shrink-0 border-t border-void-border/40">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                {t("language")}
              </span>
              <LanguageSwitcher />
            </div>

            <div className="flex items-center gap-4 w-full justify-center">
              <Link
                href={orgOrProfileHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-transparent hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/50 text-gray-300 hover:text-hyper-violet transition-all text-sm font-semibold"
              >
                <AvatarFallback
                  src={avatarUrl}
                  alt={isOrg ? "Organization Logo" : "Profile Picture"}
                  fallbackType={isOrg ? "org" : "user"}
                  sizeClassName="w-8 h-8"
                />
                <span>{isOrg ? t("myOrg") : t("myProfile")}</span>
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

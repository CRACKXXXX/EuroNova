"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Home,
  Compass,
  Building,
  Briefcase,
  User, 
  PlusCircle, 
  Menu, 
  X, 
  ShieldAlert,
  Map as MapIcon,
  Users
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { ConsoleEasterEgg } from "@/components/ConsoleEasterEgg";
import { UserLevelBadge } from "@/components/UserLevelBadge";
import { PassiveXpTracker } from "@/components/PassiveXpTracker";
import { NotificationBell } from "@/components/NotificationBell";
import { calculateLevelFromXp } from "@/lib/gamification";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";

export function Header({ 
  role, 
  isAdmin, 
  orgId: propOrgId 
}: { 
  role: "youth" | "org"; 
  isAdmin?: boolean; 
  orgId?: string | null; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Header");
  const [detectedOrgId, setDetectedOrgId] = useState<string | null>(propOrgId ?? null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [youthXp, setYouthXp] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
          // Obtener XP real del voluntario y avatar para mostrar perfil reactivo
          const { data: youth } = await supabase
            .from("users_youth")
            .select("xp, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (youth && typeof youth.xp === "number") {
            setYouthXp(youth.xp);
          }
          if (youth?.avatar_url) {
            setAvatarUrl(youth.avatar_url);
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
      <ConsoleEasterEgg />
      <PassiveXpTracker userId={currentUserId} role={role} />
      <div className="max-w-7xl mx-auto h-full flex justify-between items-center w-full px-4 md:px-8">
        {/* Left: Logo & Desktop Navigation Spaced Out */}
        <div className="flex items-center gap-6 xl:gap-8 min-w-0 flex-nowrap shrink-0">
          {/* Logo */}
          <Link
            href={`/${locale}/dashboard`}
            onClick={() => setIsOpen(false)}
            className="flex items-center group shrink-0"
          >
            {/* Desktop Logo */}
            <div className="hidden sm:block">
              <Image
                src="/logo-big.png"
                alt="EuroNova"
                width={140}
                height={38}
                priority
                className="h-9 w-auto object-contain rounded-md group-hover:scale-105 transition-transform"
              />
            </div>
            {/* Mobile / Compact Logo */}
            <div className="block sm:hidden">
              <Image
                src="/logo-small.png"
                alt="EuroNova"
                width={36}
                height={36}
                priority
                className="h-8 sm:h-9 w-auto object-contain rounded-md group-hover:scale-110 transition-transform"
              />
            </div>
          </Link>

          {/* Desktop Navigation Links - Strict single line */}
          <nav className="hidden xl:flex items-center gap-4 2xl:gap-6 flex-nowrap shrink-0 whitespace-nowrap">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all whitespace-nowrap shrink-0"
            >
              <Home className="w-4 h-4" />
              <span>{t("home")}</span>
            </Link>
            <Link
              href={`/${locale}/dashboard/projects`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all whitespace-nowrap shrink-0"
            >
              <Compass className="w-4 h-4" />
              <span>{t("searchProjects")}</span>
            </Link>
            <Link
              href={`/${locale}/dashboard/organizations`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all whitespace-nowrap shrink-0"
            >
              <Building className="w-4 h-4" />
              <span>{t("searchOrgs")}</span>
            </Link>
            <Link
              href={`/${locale}/dashboard/my-missions`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all whitespace-nowrap shrink-0"
            >
              <Briefcase className="w-4 h-4" />
              <span>{t("myMissions")}</span>
            </Link>
            <Link
              href={`/${locale}/community`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all whitespace-nowrap shrink-0"
            >
              <Users className="w-4 h-4" />
              <span>{t("community")}</span>
            </Link>
            <Link
              href={`/${locale}/map`}
              className="flex items-center gap-1.5 text-sm font-medium text-plasma-cyan hover:text-plasma-cyan/80 border-b-2 border-plasma-cyan/50 hover:border-plasma-cyan py-1 transition-all whitespace-nowrap shrink-0"
            >
              <MapIcon className="w-4 h-4" />
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
              title={t("publish") || "Publish Mission"}
              aria-label={t("publish") || "Publish Mission"}
              className="p-2 rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30 hover:border-plasma-cyan transition-all shrink-0 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.15)]"
            >
              <PlusCircle className="w-4 h-4" />
            </Link>
          )}

          {/* Clean Elegant Icon Button: Admin Shield (Immediately to the left of Profile) */}
          {isAdmin && (
            <Link
              href={`/${locale}/dashboard/admin`}
              title={t("adminPanel") || "Admin Panel"}
              aria-label={t("adminPanel") || "Admin Panel"}
              className="p-2 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 hover:border-nova-flare transition-all shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(255,46,99,0.15)]"
            >
              <ShieldAlert className="w-4 h-4" />
            </Link>
          )}

          {/* Botón My Organization / My Profile con avatar dinámico */}
          <Link
            href={orgOrProfileHref}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-surface hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/30 text-gray-300 hover:text-hyper-violet transition-all text-xs 2xl:text-sm font-semibold shrink-0 whitespace-nowrap"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={isOrg ? "Organization Logo" : "Profile Picture"}
                className="h-8 w-8 rounded-full object-cover border border-void-border/70 shrink-0 shadow-sm"
              />
            ) : isOrg ? (
              <Building className="w-4 h-4 shrink-0" />
            ) : (
              <User className="w-4 h-4 shrink-0" />
            )}
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
            className="p-2 rounded-lg border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan focus:outline-none transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
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
              className="flex items-center group shrink-0"
            >
              <Image
                src="/logo-big.png"
                alt="EuroNova"
                width={140}
                height={38}
                className="h-9 w-auto object-contain rounded-md group-hover:scale-105 transition-transform"
              />
            </Link>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-3 rounded-full border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 flex flex-col items-center justify-center gap-7 my-auto py-8 text-center">
            <Link
              href={`/${locale}/dashboard`}
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Home className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("home")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/projects`}
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Compass className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("searchProjects")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/organizations`}
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Building className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("searchOrgs")}</span>
            </Link>

            <Link
              href={`/${locale}/dashboard/my-missions`}
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Briefcase className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("myMissions")}</span>
            </Link>

            <Link
              href={`/${locale}/community`}
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Users className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("community")}</span>
            </Link>

            <Link
              href={`/${locale}/map`}
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-plasma-cyan hover:scale-105 transition-all flex items-center gap-3.5 group"
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

            {isAdmin && (
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
                Language
              </span>
              <LanguageSwitcher />
            </div>

            <div className="flex items-center gap-4 w-full justify-center">
              <Link
                href={orgOrProfileHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-void-surface hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/50 text-gray-300 hover:text-hyper-violet transition-all text-sm font-semibold"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={isOrg ? "Organization Logo" : "Profile Picture"}
                    className="h-8 w-8 rounded-full object-cover border border-void-border/70 shrink-0 shadow-sm"
                  />
                ) : isOrg ? (
                  <Building className="w-4 h-4 shrink-0" />
                ) : (
                  <User className="w-4 h-4 shrink-0" />
                )}
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

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  ChevronRight, 
  ChevronDown, 
  Compass, 
  Radio, 
  Building2, 
  Bookmark, 
  User, 
  PlusCircle, 
  Flame, 
  Sparkles,
  ShieldCheck,
  LayoutDashboard
} from "lucide-react";
import { useTranslations } from "next-intl";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  key?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

interface QuickLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const SEGMENT_MAP: Record<string, string> = {
  dashboard: "Command Center",
  projects: "Missions",
  organizations: "Organizations",
  "my-missions": "My Missions",
  profile: "Profile",
  admin: "God Mode",
  map: "Mission Radar",
  new: "Publish Mission",
  team: "Team Squad",
  webhooks: "Webhooks",
  community: "Community Hub",
};

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const pathname = usePathname() || "";
  const t = useTranslations("Breadcrumbs");
  const tCommon = useTranslations("Common");

  // Estado para controlar qué dropdown está abierto
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = (key: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 250);
  };

  // Diccionario contextual de quick links
  const CONTEXT_QUICK_LINKS: Record<string, QuickLink[]> = {
    home: [
      { label: t("home"), href: "/dashboard", icon: LayoutDashboard },
      { label: t("allMissions"), href: "/dashboard/projects", icon: Compass },
      { label: t("missionRadar"), href: "/dashboard/map", icon: Radio, badge: "GPS" },
      { label: t("organizations"), href: "/dashboard/organizations", icon: Building2 },
      { label: t("savedMissions"), href: "/dashboard/my-missions", icon: Bookmark },
      { label: t("myProfile"), href: "/dashboard/profile", icon: User },
    ],
    missions: [
      { label: t("allMissions"), href: "/dashboard/projects", icon: Compass },
      { label: t("lastMinute"), href: "/dashboard/projects?last_minute=true", icon: Flame, badge: "HOT" },
      { label: t("outermostRegions"), href: "/dashboard/projects?rup=true", icon: Sparkles, badge: "RUP" },
      { label: t("missionRadar"), href: "/dashboard/map", icon: Radio },
      { label: t("publishMission"), href: "/dashboard/projects/new", icon: PlusCircle },
    ],
    organizations: [
      { label: t("organizations"), href: "/dashboard/organizations", icon: Building2 },
      { label: t("verifiedOrgs"), href: "/dashboard/organizations", icon: ShieldCheck, badge: "VERIFIED" },
      { label: t("orgSettings"), href: "/dashboard/profile", icon: User },
    ],
  };

  // Obtener items dinámicos si no se pasaron manualmente
  let breadcrumbItems: BreadcrumbItem[] = [];

  if (items && items.length > 0) {
    breadcrumbItems = items;
  } else {
    const rawSegments = pathname.split("/").filter(Boolean);
    const segments = rawSegments.length > 0 && /^[a-z]{2}$/i.test(rawSegments[0])
      ? rawSegments.slice(1)
      : rawSegments;

    // Omitir primer 'dashboard' si está presente porque el Home ya lo representa
    const processedSegments = segments.length > 0 && segments[0].toLowerCase() === "dashboard"
      ? segments.slice(1)
      : segments;

    breadcrumbItems = processedSegments.map((seg, idx) => {
      const currentPath = `/dashboard/${processedSegments.slice(0, idx + 1).join("/")}`;
      const isLast = idx === processedSegments.length - 1;
      const isId = /^[0-9a-fA-F-]{12,}$/.test(seg);
      let label = SEGMENT_MAP[seg.toLowerCase()] || seg;

      if (isId) {
        label = "Mission Details";
      } else {
        label = label.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }

      return {
        label,
        href: isLast ? undefined : currentPath,
        key: seg.toLowerCase(),
      };
    });
  }

  const renderDropdown = (links: QuickLink[]) => (
    <div className="absolute top-full left-0 mt-2 z-50 w-56 rounded-xl bg-void-deep/95 border border-plasma-cyan/30 backdrop-blur-xl p-2 shadow-[0_10px_35px_rgba(0,0,0,0.8)] border-t border-t-plasma-cyan/50 animate-in fade-in zoom-in-95 duration-200">
      <div className="px-2 py-1 mb-1 border-b border-void-border/50 text-[10px] font-bold uppercase tracking-wider text-plasma-cyan/80 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-plasma-cyan" />
        <span>{t("quickLinks")}</span>
      </div>
      <div className="space-y-0.5">
        {links.map((link, idx) => {
          const Icon = link.icon;
          return (
            <Link
              key={idx}
              href={link.href}
              onClick={() => setActiveDropdown(null)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-void-surface transition-colors group"
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-plasma-cyan transition-colors shrink-0" />
                <span className="truncate">{link.label}</span>
              </div>
              {link.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 shrink-0 ml-1">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <nav
      ref={containerRef}
      aria-label={tCommon("breadcrumb")}
      className={`flex items-center gap-1.5 text-xs text-gray-400 flex-wrap relative ${className}`}
    >
      {/* Segmento Home / Command Center interactivo */}
      <div
        className="relative flex items-center"
        onMouseEnter={() => handleMouseEnter("home")}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-void-surface/60 transition-all group"
          title={t("commandCenter")}
        >
          <Home className="w-3.5 h-3.5 shrink-0 text-plasma-cyan group-hover:scale-110 transition-transform" />
          <span className="sr-only sm:not-sr-only sm:inline-block font-medium">{t("commandCenter")}</span>
          <ChevronDown className="w-2.5 h-2.5 text-gray-500 group-hover:text-plasma-cyan transition-colors hidden sm:inline-block" />
        </Link>

        {activeDropdown === "home" && renderDropdown(CONTEXT_QUICK_LINKS.home)}
      </div>

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const normalizedKey = (item.key || item.label).toLowerCase();
        const hasQuickLinks = !isLast && (
          normalizedKey.includes("project") ||
          normalizedKey.includes("mission") ||
          normalizedKey.includes("org")
        );
        const quickLinks = normalizedKey.includes("org")
          ? CONTEXT_QUICK_LINKS.organizations
          : CONTEXT_QUICK_LINKS.missions;

        const dropdownKey = `seg-${index}-${normalizedKey}`;

        return (
          <div
            key={index}
            className="flex items-center gap-1.5 min-w-0 relative"
            onMouseEnter={() => hasQuickLinks && handleMouseEnter(dropdownKey)}
            onMouseLeave={handleMouseLeave}
          >
            <ChevronRight className="w-3 h-3 text-void-border shrink-0" />

            {item.href && !isLast ? (
              <div className="relative">
                <Link
                  href={item.href}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-gray-400 hover:text-plasma-cyan hover:bg-void-surface/60 transition-colors truncate max-w-[150px] sm:max-w-xs group"
                >
                  <span className="truncate">{item.label}</span>
                  {hasQuickLinks && (
                    <ChevronDown className="w-2.5 h-2.5 text-gray-600 group-hover:text-plasma-cyan transition-colors shrink-0" />
                  )}
                </Link>

                {hasQuickLinks && activeDropdown === dropdownKey && renderDropdown(quickLinks)}
              </div>
            ) : (
              <span className="text-plasma-cyan font-semibold truncate max-w-[200px] sm:max-w-md px-1">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

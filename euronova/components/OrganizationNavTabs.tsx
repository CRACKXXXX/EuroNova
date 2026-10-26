"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Users, Webhook, BarChart3, ClipboardList } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Toaster } from "sonner";

interface OrganizationNavTabsProps {
  orgId: string;
  isOwner?: boolean;
}

export function OrganizationNavTabs({ orgId, isOwner = false }: OrganizationNavTabsProps) {
  const pathname = usePathname() || "";
  const locale = useLocale();
  const t = useTranslations("OrgTeam");
  const tAnalytics = useTranslations("OrgAnalytics");
  const tSurveys = useTranslations("SurveyBuilder");

  // Prefijar explícitamente con el locale activo para prevenir errores 404 en el App Router
  const basePath = `/${locale}/dashboard/organizations/${orgId}`;

  // Pestañas públicas accesibles para cualquier visitante
  const publicTabs = [
    {
      label: t("tabsOverview"),
      href: basePath,
      icon: Building,
      isActive: pathname === basePath || pathname === `/dashboard/organizations/${orgId}`,
    },
  ];

  // Pestañas de gestión interna exclusivas del propietario o administrador
  const privateTabs = [
    {
      label: t("tabsTeam"),
      href: `${basePath}/team`,
      icon: Users,
      isActive: pathname.startsWith(`${basePath}/team`) || pathname.startsWith(`/dashboard/organizations/${orgId}/team`),
    },
    {
      label: t("tabsWebhooks"),
      href: `${basePath}/webhooks`,
      icon: Webhook,
      isActive: pathname.startsWith(`${basePath}/webhooks`) || pathname.startsWith(`/dashboard/organizations/${orgId}/webhooks`),
    },
    {
      label: tAnalytics("tabsAnalytics") || "Analytics & Funnels",
      href: `${basePath}/analytics`,
      icon: BarChart3,
      isActive: pathname.startsWith(`${basePath}/analytics`) || pathname.startsWith(`/dashboard/organizations/${orgId}/analytics`),
    },
    {
      label: tSurveys("tabsSurveys") || "Survey Builder",
      href: `${basePath}/surveys`,
      icon: ClipboardList,
      isActive: pathname.startsWith(`${basePath}/surveys`) || pathname.startsWith(`/dashboard/organizations/${orgId}/surveys`),
    },
  ];

  // Estricto filtrado RBAC: visitantes generales NO reciben pestañas privadas en el DOM
  const tabs = isOwner ? [...publicTabs, ...privateTabs] : publicTabs;

  // Si no es propietario y solo hay una pestaña pública, renderizamos una barra sutil o retornamos las tabs públicas limpias
  if (!isOwner && tabs.length <= 1) {
    return (
      <div className="flex items-center justify-between border-b border-void-border/80 pb-px">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <span
                key={tab.href}
                className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 border-plasma-cyan text-plasma-cyan bg-plasma-cyan/10 shadow-[0_-4px_12px_rgba(0,229,255,0.1)] whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </span>
            );
          })}
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 pr-2 hidden sm:inline">
          {t("publicEntityDossier")}
        </span>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" theme="dark" closeButton />
      <div className="flex items-center gap-2 border-b border-void-border/80 pb-px overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                tab.isActive
                  ? "border-plasma-cyan text-plasma-cyan bg-plasma-cyan/10 shadow-[0_-4px_12px_rgba(0,229,255,0.1)]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-void-surface/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

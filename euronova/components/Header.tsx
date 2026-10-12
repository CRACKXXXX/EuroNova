"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, User, Building, PlusCircle, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/app/[locale]/login/actions";
import { useTranslations } from "next-intl";

export function Header({ role, isAdmin }: { role: "youth" | "org"; isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Header");

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-void-deep/90 backdrop-blur-md border-b border-void-border z-50">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 group shrink-0"
        >
          <Image
            src="/logo-small.png"
            alt="EuroNova"
            width={32}
            height={32}
            className="group-hover:scale-110 transition-transform"
          />
          <span className="font-black text-white text-xl tracking-tight">EuroNova</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            {t("home")}
          </Link>
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            {t("searchProjects")}
          </Link>
          <Link
            href="/dashboard/organizations"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            {t("searchOrgs")}
          </Link>
        </nav>

        {/* Desktop Actions / Auth */}
        <div className="hidden lg:flex items-center gap-3">
          {role === "org" && (
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/20 transition-all text-sm font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("publish")}</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/20 transition-all text-sm font-semibold"
            >
              <span>{t("adminPanel")}</span>
            </Link>
          )}

          <LanguageSwitcher />

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-surface hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/30 text-gray-300 hover:text-hyper-violet transition-all text-sm font-semibold"
          >
            {role === "org" ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
            <span>{role === "org" ? t("myOrg") : t("myProfile")}</span>
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all group"
              title={t("logout")}
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </form>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-2 rounded-lg border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan focus:outline-none transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="w-6 h-6 text-plasma-cyan" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown / Overlay */}
      {isOpen && (
        <div className="lg:hidden bg-void-surface/98 backdrop-blur-2xl border-b border-void-border shadow-2xl px-6 py-6 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col gap-4">
            {/* Navegación móvil */}
            <nav className="flex flex-col gap-2 pb-4 border-b border-void-border">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-void-deep transition-colors"
              >
                {t("home")}
              </Link>
              <Link
                href="/dashboard/projects"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-void-deep transition-colors"
              >
                {t("searchProjects")}
              </Link>
              <Link
                href="/dashboard/organizations"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-void-deep transition-colors"
              >
                {t("searchOrgs")}
              </Link>
            </nav>

            {/* Acciones de rol */}
            {role === "org" && (
              <Link
                href="/dashboard/projects/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/20 text-sm font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t("publish")}</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/dashboard/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-nova-flare/10 text-nova-flare border border-nova-flare/20 text-sm font-semibold"
              >
                <span>{t("adminPanel")}</span>
              </Link>
            )}

            {/* Perfil, Selector de Idioma y Cerrar Sesión */}
            <div className="pt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-void-deep border border-void-border">
                <span className="text-xs font-semibold text-gray-400">Language</span>
                <LanguageSwitcher />
              </div>

              <Link
                href="/dashboard/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-void-deep border border-void-border hover:border-hyper-violet/40 text-gray-200 text-sm font-semibold transition-all"
              >
                {role === "org" ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span>{role === "org" ? t("myOrg") : t("myProfile")}</span>
              </Link>

              <form action={logout} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-semibold transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("logout")}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

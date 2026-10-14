"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Home,
  Compass,
  Building,
  Briefcase,
  LogOut, 
  User, 
  PlusCircle, 
  Menu, 
  X, 
  ShieldAlert 
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/app/[locale]/login/actions";
import { useTranslations } from "next-intl";

export function Header({ role, isAdmin }: { role: "youth" | "org"; isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Header");

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
      <div className="max-w-7xl mx-auto h-full flex justify-between items-center w-full px-4 md:px-8">
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

        {/* Desktop Navigation Links (Uniform with icons & subtle bottom-border hover) */}
        <nav className="hidden xl:flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>{t("home")}</span>
          </Link>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>{t("searchProjects")}</span>
          </Link>
          <Link
            href="/dashboard/organizations"
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all"
          >
            <Building className="w-4 h-4" />
            <span>{t("searchOrgs")}</span>
          </Link>
          <Link
            href="/dashboard/my-missions"
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-plasma-cyan border-b-2 border-transparent hover:border-plasma-cyan py-1 transition-all"
          >
            <Briefcase className="w-4 h-4" />
            <span>{t("myMissions")}</span>
          </Link>
        </nav>

        {/* Desktop Actions / Auth */}
        <div className="hidden xl:flex items-center gap-3 shrink-0">
          {role === "org" && (
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/20 transition-all text-sm font-semibold shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("publish")}</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/20 transition-all text-sm font-semibold shrink-0"
            >
              <span>{t("adminPanel")}</span>
            </Link>
          )}

          <div className="shrink-0 flex items-center">
            <LanguageSwitcher />
          </div>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-surface hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/30 text-gray-300 hover:text-hyper-violet transition-all text-sm font-semibold shrink-0"
          >
            {role === "org" ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
            <span>{role === "org" ? t("myOrg") : t("myProfile")}</span>
          </Link>

          <form action={logout} className="shrink-0 flex items-center">
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-transparent border border-gray-600 text-gray-400 hover:border-nova-flare hover:text-nova-flare transition-all duration-300 group cursor-pointer"
              title={t("logout")}
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </form>
        </div>

        {/* Mobile / Tablet Hamburger Toggle */}
        <div className="flex items-center gap-2 xl:hidden">
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

      {/* True Full-Screen Mobile Overlay with Guaranteed Solid Hex Background */}
      {isOpen && (
        <div
          style={{ backgroundColor: "#050508" }}
          className="fixed inset-0 z-[9999] flex flex-col min-h-screen w-screen backdrop-blur-3xl overflow-y-auto p-6 sm:p-8 animate-in fade-in duration-200"
        >
          {/* Top Bar: Brand & Large Accessible Close Button */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto shrink-0 pb-4">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 group shrink-0"
            >
              <Image
                src="/logo-small.png"
                alt="EuroNova"
                width={36}
                height={36}
                className="group-hover:scale-110 transition-transform"
              />
              <span className="font-black text-white text-2xl tracking-tight">EuroNova</span>
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

          {/* Center Area: Clean Minimalist Centered Navigation Links */}
          <nav className="flex-1 flex flex-col items-center justify-center gap-7 my-auto py-8 text-center">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Home className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("home")}</span>
            </Link>

            <Link
              href="/dashboard/projects"
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Compass className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("searchProjects")}</span>
            </Link>

            <Link
              href="/dashboard/organizations"
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Building className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("searchOrgs")}</span>
            </Link>

            <Link
              href="/dashboard/my-missions"
              onClick={() => setIsOpen(false)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-300 hover:text-plasma-cyan transition-all flex items-center gap-3.5 group"
            >
              <Briefcase className="w-6 h-6 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              <span>{t("myMissions")}</span>
            </Link>

            {role === "org" && (
              <Link
                href="/dashboard/projects/new"
                onClick={() => setIsOpen(false)}
                className="text-xl sm:text-2xl font-bold tracking-tight text-plasma-cyan hover:scale-105 transition-all flex items-center gap-2.5"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{t("publish")}</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/dashboard/admin"
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
                href="/dashboard/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-void-surface hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/50 text-gray-300 hover:text-hyper-violet transition-all text-sm font-semibold"
              >
                {role === "org" ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span>{role === "org" ? t("myOrg") : t("myProfile")}</span>
              </Link>

              <form action={logout}>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-transparent border border-gray-600 text-gray-400 hover:border-nova-flare hover:text-nova-flare text-sm font-semibold transition-all cursor-pointer group"
                  title={t("logout")}
                >
                  <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
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

"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { logout } from "@/app/[locale]/login/actions";
import { LogOut, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface LogoutButtonProps {
  variant?: "icon" | "full";
  className?: string;
  onClickExtra?: () => void;
}

const subscribe = () => () => {};

export function LogoutButton({
  variant = "icon",
  className = "",
  onClickExtra,
}: LogoutButtonProps) {
  const router = useRouter();
  const t = useTranslations("Header");
  const tLogin = useTranslations("Login");
  const [isPending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (onClickExtra) onClickExtra();

    startTransition(async () => {
      try {
        setShowToast(true);
        await logout();
        setTimeout(() => {
          router.push("/login");
          router.refresh();
        }, 750);
      } catch {
        setShowToast(false);
        router.push("/login");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending || showToast}
        title={t("logout")}
        aria-label={t("logout")}
        className={
          className ||
          (variant === "icon"
            ? "p-2 min-w-[44px] min-h-[44px] rounded-lg bg-transparent border border-gray-600 text-gray-400 hover:border-nova-flare hover:text-nova-flare focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none transition-all duration-300 group cursor-pointer disabled:opacity-50 flex items-center justify-center"
            : "flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-transparent border border-gray-600 text-gray-400 hover:border-nova-flare hover:text-nova-flare focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none text-sm font-semibold transition-all cursor-pointer group disabled:opacity-50")
        }
      >
        {isPending || showToast ? (
          <Loader2 className="w-4 h-4 animate-spin text-nova-flare" />
        ) : (
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
        )}
        {variant === "full" && (
          <span>
            {isPending || showToast
              ? tLogin("loggingOut")
              : t("logout")}
          </span>
        )}
      </button>

      {/* Cosmic Glassmorphism Logout Toast */}
      {showToast && mounted && createPortal(
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-top-5 duration-500">
          <div className="bg-void-surface/90 border border-plasma-cyan/60 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_0_35px_rgba(0,229,255,0.3)] flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-plasma-cyan/20 border border-plasma-cyan/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              <Sparkles className="w-5 h-5 text-plasma-cyan animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-plasma-cyan">
                {tLogin("orbitalDeparture")}
              </p>
              <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                {tLogin("logoutSuccess")}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

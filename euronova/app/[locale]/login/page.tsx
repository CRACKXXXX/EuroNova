"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";

function LoginContent() {
  const t = useTranslations("Login");
  const searchParams = useSearchParams();
  const [isViewLogin, setIsViewLogin] = useState(true);

  useEffect(() => {
    const mode = searchParams.get("mode") || searchParams.get("view");
    if (mode === "signup" || mode === "register") {
      setIsViewLogin(false);
    } else {
      setIsViewLogin(true);
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-void-deep flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Header Público Fijo */}
      <PublicHeader />

      {/* Efectos Cósmicos de Fondo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-hyper-violet/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-plasma-cyan/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Tarjeta de Acceso con Deep Glassmorphism */}
      <div className="z-10 w-full max-w-md bg-void-surface/60 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-void-border rounded-2xl p-6 sm:p-8 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/logo-big.png" 
            alt="EuroNova Logo" 
            width={300} 
            height={80} 
            priority 
            className="w-auto h-auto max-w-full drop-shadow-[0_0_25px_rgba(0,229,255,0.15)]" 
          />
          <h2 className="sr-only">EuroNova</h2>
          <p className="text-gray-400 mt-2 text-sm sm:text-base font-light">
            {isViewLogin ? t('welcome') : t('join')}
          </p>
        </div>

        {isViewLogin ? (
          <LoginForm onToggleView={() => setIsViewLogin(false)} />
        ) : (
          <RegisterForm onToggleView={() => setIsViewLogin(true)} />
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-void-border"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-void-surface px-2.5 text-gray-400 font-medium">{t('orContinueWith')}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-void-deep/80 border border-void-border hover:border-gray-400 hover:bg-void-deep text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>

      {/* Expanded Browser Translation Tip (2-Line Dedicated Card) */}
      <div className="z-10 w-full max-w-md mt-6 p-4 rounded-xl bg-void-surface/60 border border-void-border/80 backdrop-blur-2xl flex items-start gap-3.5 shadow-2xl">
        <div className="w-9 h-9 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)] mt-0.5">
          <Globe className="w-4 h-4 text-plasma-cyan animate-pulse" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs sm:text-sm font-bold text-white leading-snug">
            {t("translationTipTitle")}
          </p>
          <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed font-mono">
            {t("translationTipDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void-deep" />}>
      <LoginContent />
    </Suspense>
  );
}

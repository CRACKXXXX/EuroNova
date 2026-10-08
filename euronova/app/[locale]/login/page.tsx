"use client";

import { useState, useActionState } from "react";
import { User, Building } from "lucide-react";
import { login, signup } from "./actions";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const t = useTranslations("Login");
  const [isViewLogin, setIsViewLogin] = useState(true);
  const [role, setRole] = useState<"youth" | "org">("youth");

  // React 19 hooks para Server Actions
  const [loginState, loginAction, isLoginPending] = useActionState(login, null);
  const [signupState, signupAction, isSignupPending] = useActionState(signup, null);

  const error = isViewLogin ? loginState?.error : signupState?.error;
  const loading = isViewLogin ? isLoginPending : isSignupPending;
  // Determinamos dinámicamente qué acción enviar
  const formAction = isViewLogin ? loginAction : signupAction;

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
    <div className="min-h-screen bg-void-deep flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Efectos Cósmicos */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-hyper-violet/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-plasma-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-md bg-void-surface border border-void-border rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-big.png" alt="EuroNova Logo" width={300} height={80} priority />
          <h2 className="sr-only">EuroNova</h2>
          <p className="text-gray-400 mt-2">
            {isViewLogin ? t('welcome') : t('join')}
          </p>
        </div>

        <form action={formAction} className="space-y-6">
          {!isViewLogin && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-sm font-medium text-gray-300">{t('role')}</label>
              
              {/* Input oculto vital para pasar el valor del role al Server Action formData */}
              <input type="hidden" name="role" value={role} />
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("youth")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    role === "youth"
                      ? "border-plasma-cyan bg-plasma-cyan/10 text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                      : "border-void-border bg-void-deep text-gray-400 hover:border-gray-500 hover:bg-void-surface"
                  }`}
                >
                  <User className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">{t('volunteer')}</span>
                  <span className="text-xs opacity-70">(Joven)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("org")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    role === "org"
                      ? "border-hyper-violet bg-hyper-violet/10 text-hyper-violet shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                      : "border-void-border bg-void-deep text-gray-400 hover:border-gray-500 hover:bg-void-surface"
                  }`}
                >
                  <Building className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">{t('org')}</span>
                  <span className="text-xs opacity-70">(Entidad)</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('email')}</label>
            <input
              type="email"
              name="email"
              required
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('password')}</label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-nova-flare/20 border border-nova-flare text-nova-flare font-semibold text-sm text-center animate-in zoom-in-95 duration-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : isViewLogin ? t('loginBtn') : t('signupBtn')}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-void-border"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-void-surface px-2 text-gray-500">O continuar con</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-void-deep border border-void-border hover:border-gray-500 hover:bg-void-deep/80 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-3"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsViewLogin(!isViewLogin)}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {isViewLogin
              ? t('noAccount')
              : t('hasAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}

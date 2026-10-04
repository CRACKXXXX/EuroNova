"use client";

import { useState, useActionState } from "react";
import { User, Building } from "lucide-react";
import { login, signup } from "./actions";
import { useTranslations } from "next-intl";
import Image from "next/image";

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

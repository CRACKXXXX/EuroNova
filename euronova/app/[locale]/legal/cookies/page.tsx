"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, ShieldCheck, Lock, Sliders, CheckCircle2, ShieldAlert } from "lucide-react";

interface CookiesPageProps {
  params: Promise<{ locale: string }>;
}

export default function CookiesPolicyPage(props: CookiesPageProps) {
  const { locale } = use(props.params);
  const isEs = locale === "es";

  const handleOpenPreferences = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("euronova:open-cookie-preferences"));
    }
  };

  return (
    <div className="min-h-screen bg-void-deep text-gray-300">
      <div className="max-w-4xl mx-auto space-y-10 px-4 sm:px-6 lg:px-8 py-12">
        {/* Enlace de Retorno */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-plasma-cyan" />
            <span>{isEs ? "Volver a Inicio" : "Back to Home"}</span>
          </Link>
        </div>

        {/* Cabecera Principal */}
        <div className="relative overflow-hidden rounded-3xl border border-void-border bg-void-surface/90 p-8 sm:p-10 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-plasma-cyan/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-plasma-cyan/30 bg-plasma-cyan/10 text-plasma-cyan text-xs font-bold uppercase tracking-wider">
              <Cookie className="w-4 h-4" />
              <span>{isEs ? "Directiva ePrivacy & RGPD Art. 7.3" : "ePrivacy Directive & GDPR Art. 7.3 Compliant"}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {isEs ? (
                <>Política de <span className="text-plasma-cyan">Cookies</span></>
              ) : (
                <>Cookie <span className="text-plasma-cyan">Policy</span></>
              )}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              {isEs
                ? "Información detallada sobre el uso de cookies técnicas esenciales y el bloqueo estricto de telemetría no esencial en EuroNova."
                : "Comprehensive information regarding our deployment of strictly necessary technical cookies and strict fail-closed blocking of optional telemetry."}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleOpenPreferences}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs sm:text-sm hover:bg-plasma-cyan/90 transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>{isEs ? "Configurar Preferencias de Cookies" : "Manage Cookie Preferences"}</span>
              </button>
              <div className="text-xs text-gray-500 font-mono">
                {isEs ? "Última actualización: Octubre 2026" : "Last updated: October 2026"}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Detallado */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed">
          {isEs ? (
            /* ==================== VERSIÓN EN ESPAÑOL ==================== */
            <>
              {/* 1. ¿Qué son las cookies? */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <Cookie className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">1. ¿Qué son las Cookies y cómo las tratamos?</h2>
                </div>
                <p>
                  Las cookies son pequeños ficheros de texto que se almacenan en el navegador del usuario al visitar un sitio web. En <strong>EuroNova</strong> operamos bajo el principio de <em>Privacidad por Diseño</em> (Art. 25 RGPD), lo que significa que <strong>NO implementamos cookies publicitarias, ni rastreadores de terceros con fines comerciales ni perfiles de comportamiento</strong>.
                </p>
              </section>

              {/* 2. Cookies Técnicas Esenciales */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <Lock className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">2. Cookies Técnicas Estrictamente Necesarias (Exentas de Consentimiento)</h2>
                </div>
                <p>
                  De conformidad con el artículo 22.2 de la Ley 34/2002 (LSSI-CE) y las directrices del Comité Europeo de Protección de Datos (CEPD), las cookies técnicas esenciales son aquellas imprescindibles para la navegación y la prestación del servicio expresamente solicitado por el usuario. No requieren consentimiento previo.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border border-void-border rounded-xl overflow-hidden font-mono">
                    <thead className="bg-void-deep text-plasma-cyan uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3 border-b border-void-border">Nombre</th>
                        <th className="p-3 border-b border-void-border">Proveedor</th>
                        <th className="p-3 border-b border-void-border">Finalidad</th>
                        <th className="p-3 border-b border-void-border">Caducidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-void-border/60 bg-void-surface/40">
                      <tr>
                        <td className="p-3 font-bold text-white">sb-*-auth-token</td>
                        <td className="p-3 text-gray-400">Supabase Auth</td>
                        <td className="p-3 text-gray-300">Autenticación criptográfica segura de sesión.</td>
                        <td className="p-3 text-gray-400">Sesión / 1 año</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-white">euronova_consent</td>
                        <td className="p-3 text-gray-400">EuroNova Core</td>
                        <td className="p-3 text-gray-300">Almacena la preferencia de consentimiento del usuario.</td>
                        <td className="p-3 text-gray-400">1 año</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-white">NEXT_LOCALE</td>
                        <td className="p-3 text-gray-400">Next-Intl</td>
                        <td className="p-3 text-gray-300">Mantiene el idioma seleccionado por el usuario en la interfaz.</td>
                        <td className="p-3 text-gray-400">Persistente</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 3. Telemetría Opcional y Bloqueo Activo */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <ShieldCheck className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">3. Telemetría de Rendimiento Opcional (Bloqueo Activo)</h2>
                </div>
                <p>
                  Cualquier script o cookie opcional de analítica de rendimiento se encuentra estrictamente <strong>bloqueado por defecto</strong> hasta que el usuario decida voluntariamente pulsar en <em>"Aceptar Analítica y Telemetría"</em>.
                </p>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-void-deep border border-void-border text-xs text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-rup-emerald shrink-0" />
                  <span>
                    El rechazo de cookies opcionales <strong>no limita de ninguna forma</strong> el acceso completo a los proyectos de movilidad, mapas, foros o solicitudes en EuroNova.
                  </span>
                </div>
              </section>

              {/* 4. Revocación en Cualquier Momento */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <Sliders className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">4. Cómo Revocar tu Consentimiento</h2>
                </div>
                <p>
                  Conforme al Artículo 7.3 del RGPD, retirar el consentimiento debe ser tan fácil como otorgarlo. Puedes cambiar tu elección en cualquier momento haciendo clic en el botón inferior o en el enlace permanente <strong>"Preferencias de Cookies"</strong> ubicado en el pie de página de todo el sitio web.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenPreferences}
                    className="py-2.5 px-4 rounded-xl bg-void-deep hover:bg-void-surface border border-plasma-cyan/50 text-plasma-cyan text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Abrir Panel de Preferencias</span>
                  </button>
                </div>
              </section>
            </>
          ) : (
            /* ==================== ENGLISH VERSION ==================== */
            <>
              {/* 1. What are cookies? */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <Cookie className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">1. What Are Cookies & Our Philosophy</h2>
                </div>
                <p>
                  Cookies are small text records placed on your computing device when visiting online platforms. At <strong>EuroNova</strong>, we operate strictly under Privacy by Design principles (GDPR Art. 25). <strong>We do not deploy commercial advertising cookies, cross-site trackers, or behavioral profiling scripts.</strong>
                </p>
              </section>

              {/* 2. Strictly Necessary Technical Cookies */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <Lock className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">2. Strictly Necessary Technical Cookies (Exempt from Consent)</h2>
                </div>
                <p>
                  Pursuant to Article 22.2 of Spanish Law 34/2002 (LSSI-CE) and European Data Protection Board guidelines, essential technical cookies are strictly required to navigate the platform and deliver core authenticated functionality. These do not require prior consent.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border border-void-border rounded-xl overflow-hidden font-mono">
                    <thead className="bg-void-deep text-plasma-cyan uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3 border-b border-void-border">Cookie Key</th>
                        <th className="p-3 border-b border-void-border">Provider</th>
                        <th className="p-3 border-b border-void-border">Purpose</th>
                        <th className="p-3 border-b border-void-border">Retention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-void-border/60 bg-void-surface/40">
                      <tr>
                        <td className="p-3 font-bold text-white">sb-*-auth-token</td>
                        <td className="p-3 text-gray-400">Supabase Auth</td>
                        <td className="p-3 text-gray-300">Cryptographic session authentication and user security.</td>
                        <td className="p-3 text-gray-400">Session / 1 Year</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-white">euronova_consent</td>
                        <td className="p-3 text-gray-400">EuroNova Core</td>
                        <td className="p-3 text-gray-300">Stores your explicit tracking consent decision.</td>
                        <td className="p-3 text-gray-400">1 Year</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-white">NEXT_LOCALE</td>
                        <td className="p-3 text-gray-400">Next-Intl</td>
                        <td className="p-3 text-gray-300">Preserves interface locale selection across page requests.</td>
                        <td className="p-3 text-gray-400">Persistent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 3. Optional Telemetry */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <ShieldCheck className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">3. Optional Performance Telemetry (Fail-Closed Active Blocker)</h2>
                </div>
                <p>
                  Any non-essential analytics or performance scripts remain strictly blocked until you explicitly grant consent by choosing <em>"Accept Analytics & Telemetry"</em>.
                </p>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-void-deep border border-void-border text-xs text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-rup-emerald shrink-0" />
                  <span>
                    Rejecting optional cookies <strong>will never limit</strong> your ability to explore verified missions, submit applications, or participate in youth forums.
                  </span>
                </div>
              </section>

              {/* 4. Active Revocation */}
              <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
                  <Sliders className="w-5 h-5 text-plasma-cyan" />
                  <h2 className="text-plasma-cyan">4. How to Revoke Consent (GDPR Art. 7.3)</h2>
                </div>
                <p>
                  Withdrawing consent is as simple as granting it. You can adjust your preference at any moment using the button below or via the permanent <strong>"Privacy & Cookie Preferences"</strong> link located in the global footer.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenPreferences}
                    className="py-2.5 px-4 rounded-xl bg-void-deep hover:bg-void-surface border border-plasma-cyan/50 text-plasma-cyan text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Open Preferences Panel</span>
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

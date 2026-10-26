"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Webhook, 
  Radio, 
  MessageSquare, 
  Terminal, 
  ShieldCheck, 
  Check, 
  Save, 
  RefreshCw,
  Loader2
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { OrganizationNavTabs } from "@/components/OrganizationNavTabs";
import { testWebhookAction, TriggerWebhookResult } from "@/actions/webhooks";
import { createClient } from "@/utils/supabase/client";

interface WebhooksClientProps {
  orgId: string;
  orgName?: string;
}

export function WebhooksClient({ orgId }: WebhooksClientProps) {
  const t = useTranslations("Webhooks");

  const [discordUrl, setDiscordUrl] = useState("");
  const [slackUrl, setSlackUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Eventos activos
  const [events, setEvents] = useState({
    applications: true,
    reviews: true,
    reports: false,
  });

  // Estados de test y guardado
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [isSaving, startSaving] = useTransition();

  // Cargar configuración de webhooks persistida desde Supabase
  useEffect(() => {
    let ignore = false;

    async function loadWebhooksData() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("org_webhooks")
          .select("discord_url, slack_url, events")
          .eq("org_id", orgId)
          .maybeSingle();

        if (!error && data && !ignore) {
          if (data.discord_url) setDiscordUrl(data.discord_url);
          if (data.slack_url) setSlackUrl(data.slack_url);
          if (data.events && typeof data.events === "object") {
            setEvents((prev) => ({ ...prev, ...(data.events as Record<string, boolean>) }));
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load organizational webhooks:", err);
          toast.error(t("loadWebhooksError"));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadWebhooksData();

    return () => {
      ignore = true;
    };
  }, [orgId, t]);

  const validateWebhookUrl = (url: string, platform: "discord" | "slack"): boolean => {
    const trimmed = url.trim();
    if (!trimmed) return false;

    if (!trimmed.startsWith("https://")) {
      toast.error(t("httpsRequiredError"));
      return false;
    }

    if (platform === "discord") {
      const isDiscord = trimmed.includes("discord.com/api/webhooks/") || trimmed.includes("discordapp.com/api/webhooks/");
      if (!isDiscord) {
        toast.error(t("invalidDiscordUrlError"));
        return false;
      }
    }

    if (platform === "slack") {
      const isSlack = trimmed.includes("hooks.slack.com/services/");
      if (!isSlack) {
        toast.error(t("invalidSlackUrlError"));
        return false;
      }
    }

    return true;
  };

  const handleTestWebhook = async (platform: "discord" | "slack") => {
    const targetUrl = platform === "discord" ? discordUrl : slackUrl;

    if (!targetUrl || !targetUrl.trim()) {
      toast.error(t("urlRequired") || `Please enter a valid ${platform.toUpperCase()} webhook URL first.`);
      return;
    }

    if (!validateWebhookUrl(targetUrl, platform)) {
      return;
    }

    if (platform === "discord") setIsTestingDiscord(true);
    else setIsTestingSlack(true);

    const toastId = toast.loading(`Transmitting test ping to ${platform.toUpperCase()}...`);

    try {
      const result: TriggerWebhookResult = await testWebhookAction(targetUrl, platform, orgId);

      if (result.success) {
        const successMsg = platform === "discord"
          ? (t("testSuccessDiscord"))
          : (t("testSuccessSlack"));
        toast.success(successMsg, { id: toastId });
      } else {
        toast.error(result.error || "Failed to trigger webhook test.", { id: toastId });
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Network error testing webhook";
      toast.error(errText, { id: toastId });
    } finally {
      if (platform === "discord") setIsTestingDiscord(false);
      else setIsTestingSlack(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar URLs si fueron introducidas
    if (discordUrl.trim() && !validateWebhookUrl(discordUrl, "discord")) {
      return;
    }

    if (slackUrl.trim() && !validateWebhookUrl(slackUrl, "slack")) {
      return;
    }

    startSaving(async () => {
      const toastId = toast.loading("Saving webhook configuration to Supabase...");
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("org_webhooks")
          .upsert(
            {
              org_id: orgId,
              discord_url: discordUrl.trim() || null,
              slack_url: slackUrl.trim() || null,
              events,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "org_id" }
          );

        if (error) {
          toast.error(t("saveWebhooksError", { error: error.message }), { id: toastId });
        } else {
          toast.success(t("saveSuccess"), { id: toastId });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Database error saving configuration";
        toast.error(msg, { id: toastId });
      }
    });
  };

  const hasConfiguredWebhooks = Boolean(discordUrl.trim() || slackUrl.trim());

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <OrganizationNavTabs orgId={orgId} isOwner={true} />

      {/* Control bar / Status banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-void-surface/80 border border-void-border p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-plasma-cyan/15 border border-plasma-cyan/40 flex items-center justify-center text-plasma-cyan">
            <Webhook className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {t("title")}
            </h2>
            <p className="text-xs text-gray-400">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            hasConfiguredWebhooks
              ? "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/40"
              : "bg-void-deep text-gray-400 border-void-border"
          }`}>
            {hasConfiguredWebhooks ? "Gateway Active" : "Gateway Idle"}
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-44 rounded-3xl bg-void-surface/50 border border-void-border animate-pulse" />
          <div className="h-44 rounded-3xl bg-void-surface/50 border border-void-border animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Card 1: Discord Gateway */}
          <div className="bg-void-surface/80 border border-void-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-void-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-hyper-violet/15 border border-hyper-violet/40 flex items-center justify-center text-hyper-violet shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {t("discordTitle")}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {t("discordDesc")}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-void-deep border border-void-border text-gray-400 self-start sm:self-auto">
                {t("discordPayload")}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                {t("webhookUrlLabel")}
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  placeholder={t("discordWebhookPlaceholder")}
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm text-white placeholder-gray-500 font-mono outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleTestWebhook("discord")}
                  disabled={isTestingDiscord || !discordUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-void-deep border border-hyper-violet/40 text-hyper-violet hover:bg-hyper-violet/10 text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isTestingDiscord ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("testing")}</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-3.5 h-3.5" />
                      <span>{t("testWebhook")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Slack Gateway */}
          <div className="bg-void-surface/80 border border-void-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-void-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/40 flex items-center justify-center text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {t("slackTitle")}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {t("slackDesc")}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-void-deep border border-void-border text-gray-400 self-start sm:self-auto">
                {t("slackHook")}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                {t("webhookUrlLabel")}
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  placeholder={t("slackWebhookPlaceholder")}
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm text-white placeholder-gray-500 font-mono outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleTestWebhook("slack")}
                  disabled={isTestingSlack || !slackUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-void-deep border border-plasma-cyan/40 text-plasma-cyan hover:bg-plasma-cyan/10 text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isTestingSlack ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("testing")}</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-3.5 h-3.5" />
                      <span>{t("testWebhook")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Event Triggers & Save */}
          <div className="bg-void-surface/80 border border-void-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rup-emerald" />
              <span>{t("eventsTitle")}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  key: "applications" as const,
                  label: t("eventApplications"),
                  desc: t("eventApplicationsDesc"),
                },
                {
                  key: "reviews" as const,
                  label: t("eventReviews"),
                  desc: t("eventReviewsDesc"),
                },
                {
                  key: "reports" as const,
                  label: t("eventReports"),
                  desc: t("eventReportsDesc"),
                },
              ].map((ev) => (
                <button
                  key={ev.key}
                  type="button"
                  onClick={() => setEvents((prev) => ({ ...prev, [ev.key]: !prev[ev.key] }))}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    events[ev.key]
                      ? "bg-plasma-cyan/10 border-plasma-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                      : "bg-void-deep/60 border-void-border text-gray-400 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${events[ev.key] ? "text-white" : "text-gray-400"}`}>
                      {ev.label}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        events[ev.key]
                          ? "bg-plasma-cyan border-plasma-cyan text-void-deep"
                          : "border-gray-600 bg-void-surface"
                      }`}
                    >
                      {events[ev.key] && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{ev.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-void-border">
              <span className="text-xs text-gray-400">
                {t("dbConfigNotice")} (<code className="font-mono text-plasma-cyan">org_webhooks</code>).
              </span>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t("saving")}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t("saveSettings")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default WebhooksClient;

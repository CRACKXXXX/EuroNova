import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { redirect } from "next/navigation";
import { 
  User, 
  Building, 
  ShieldCheck, 
  Languages, 
  Sparkles, 
  BadgeCheck, 
  BookmarkCheck, 
  Zap, 
  Clock, 
  FolderArchive, 
  Share2, 
  Star, 
  Leaf, 
  Award, 
  Lock,
  Headphones 
} from "lucide-react";
import Link from "next/link";
import { getTranslations, getFormatter } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RecentlyViewedMissions } from "@/components/RecentlyViewedMissions";
import { LevelReputationModule } from "@/components/LevelReputationModule";
import { calculateLevelFromXp } from "@/lib/gamification";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface YouthProfile {
  id: string;
  full_name?: string | null;
  country_code?: string | null;
  phone?: string | null;
  bio?: string | null;
  languages?: string[] | string | null;
  avatar_url?: string | null;
  is_rup_region?: boolean | null;
  verification_status?: string | null;
  xp?: number | null;
  trust_score?: number | null;
  [key: string]: unknown;
}

interface OrgProfile {
  id: string;
  org_name?: string | null;
  country_hq?: string | null;
  description?: string | null;
  contact_email?: string | null;
  website?: string | null;
  avatar_url?: string | null;
  verification_status?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_youtube?: string | null;
  social_linkedin?: string | null;
  [key: string]: unknown;
}

function getAccountAgeDays(createdAtString?: string | null): number {
  if (!createdAtString) return 0;
  const created = new Date(createdAtString);
  const time = created.getTime();
  if (isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
}

export default async function ProfilePage(props: {
  params?: Promise<{ locale?: string }>;
}) {
  const resolvedParams = await props?.params;
  const locale = resolvedParams?.locale || "en";
  const t = await getTranslations("Profile");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // 1. Determinar el rol (Solo 'org' u 'organization' cargan perfil de ONG. Staff y youth cargan perfil personal youth)
  const rawMetadataRole = (user.user_metadata?.role || "").toLowerCase().trim();
  const isOrg = rawMetadataRole === "org" || rawMetadataRole === "organization";
  const role: "youth" | "org" = isOrg ? "org" : "youth";
  let profileData: Record<string, unknown> | null = null;

  // 2. Extraer datos o forzar su creación
  if (role === "youth") {
    const { data: youthData } = await supabase
      .from("users_youth")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (youthData) {
      profileData = youthData as Record<string, unknown>;
    } else {
      const { data: newYouth } = await supabase
        .from("users_youth")
        .upsert({ id: user.id })
        .select()
        .single();
      profileData = newYouth as Record<string, unknown>;
    }
  } else {
    const { data: orgData } = await supabase
      .from("users_org")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (orgData) {
      profileData = orgData as Record<string, unknown>;
    } else {
      const { data: newOrg } = await supabase
        .from("users_org")
        .upsert({ id: user.id })
        .select()
        .single();
      profileData = newOrg as Record<string, unknown>;
    }
  }

  // 3. Consultar interacciones reales del usuario para insignias dinámicas
  const { count: favoritesCount } = await supabase
    .from("user_project_interactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_favorite", true);

  const { count: appliedCount } = await supabase
    .from("user_project_interactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_applied", true);

  // 4. Cálculo dinámico de completitud del perfil
  let completionPercentage = 0;
  if (role === "youth") {
    const yp = (profileData || {}) as YouthProfile;
    const fields = [
      Boolean(yp.full_name && yp.full_name.trim().length > 0),
      Boolean(yp.country_code && yp.country_code.trim().length > 0),
      Boolean(yp.phone && yp.phone.trim().length > 0),
      Boolean(yp.bio && yp.bio.trim().length > 0),
      Boolean(
        yp.languages &&
        (Array.isArray(yp.languages) ? yp.languages.length > 0 : String(yp.languages).trim().length > 0)
      ),
      Boolean(yp.avatar_url && yp.avatar_url.trim().length > 0)
    ];
    const completedCount = fields.filter(Boolean).length;
    completionPercentage = Math.round((completedCount / fields.length) * 100);
  } else {
    const op = (profileData || {}) as OrgProfile;
    const fields = [
      Boolean(op.org_name && op.org_name.trim().length > 0),
      Boolean(op.country_hq && op.country_hq.trim().length > 0),
      Boolean(op.description && op.description.trim().length > 0),
      Boolean(op.contact_email && op.contact_email.trim().length > 0),
      Boolean(op.website && op.website.trim().length > 0),
      Boolean(op.avatar_url && op.avatar_url.trim().length > 0)
    ];
    const completedCount = fields.filter(Boolean).length;
    completionPercentage = Math.round((completedCount / fields.length) * 100);
  }

  // Helper defensivo para traducciones con fallback en inglés
  const getT = (key: string, fallback: string) => {
    return t.has(key) ? t(key) : fallback;
  };

  // 5. Configuración de 12 insignias HARDCORE Erasmus+/ESC
  const yp = (profileData || {}) as YouthProfile;
  const op = (profileData || {}) as OrgProfile;

  const languagesList: string[] = role === "youth" && yp.languages
    ? (Array.isArray(yp.languages) ? yp.languages : String(yp.languages).split(",").map(s => s.trim()).filter(Boolean))
    : [];

  // Variables de telemetría y conteos estrictos
  const savedProjectsCount = favoritesCount || 0;
  const appliedProjectsCount = appliedCount || 0;

  // Nivel del usuario calculado y detección de hito Level 10+
  const userXp = typeof profileData?.xp === "number" ? profileData.xp : 0;
  const userLevel = calculateLevelFromXp(userXp);
  const isLevel10Plus = userLevel >= 10;

  // Notificación automática al alcanzar Nivel 10 para postularse al rol de Soporte
  if (role === "youth" && isLevel10Plus) {
    try {
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", "Level 10 Vanguard: Apply for Staff Support Role!")
        .limit(1);

      if (!existingNotif || existingNotif.length === 0) {
        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: user.id,
          type: "system",
          title: "Level 10 Vanguard: Apply for Staff Support Role!",
          message: "Congratulations on reaching Level 10! You have unlocked official eligibility to join the EuroNova Staff as a Support Specialist. Open a support ticket to submit your candidacy.",
          actionUrl: `/${locale}/dashboard/support?reason=apply_support`,
        });
      }
    } catch {
      // non-blocking
    }
  }

  // Antigüedad de la cuenta en días calculada a partir de created_at
  const userCreatedAt = user.created_at ? new Date(user.created_at) : new Date();
  const accountAgeDays = getAccountAgeDays(user.created_at);
  const joinedYear = userCreatedAt.getFullYear();

  // Variables preparadas para telemetría de carpetas, shares, green travel y referidos
  const customFoldersCount = 0;
  const sharedProjectsCount = 0;
  const hasGreenTravelInteraction = false;
  const referralCount = 0;

  const achievements = [
    {
      id: "profile_perfection",
      title: getT("profilePerfection", "Profile Perfection"),
      desc: getT("profilePerfectionDesc", "Complete 100% of all dossier fields in your youth or organization profile."),
      icon: ShieldCheck,
      isUnlocked: completionPercentage === 100,
      progressText: `${completionPercentage}% / 100%`,
      glowColor: "plasma-cyan"
    },
    {
      id: "early_adopter",
      title: getT("earlyAdopter", "Early Adopter"),
      desc: getT("earlyAdopterDesc", "Joined during the EuroNova orbital genesis year (2026)."),
      icon: Star,
      isUnlocked: joinedYear === 2026,
      progressText: `Joined: ${joinedYear}`,
      glowColor: "yellow"
    },
    {
      id: "outermost_pioneer",
      title: getT("outermostPioneer", "Outermost Pioneer"),
      desc: getT("outermostPioneerDesc", "Resident in an official Outermost Region (Canary Islands, Madeira, Azores, etc.)."),
      icon: Sparkles,
      isUnlocked: Boolean(yp.is_rup_region || yp.country_code === "ES-CN" || op.country_hq === "ES-CN"),
      progressText: Boolean(yp.is_rup_region || yp.country_code === "ES-CN" || op.country_hq === "ES-CN") ? "ORs Resident" : "Non-ORs Region",
      glowColor: "rup-emerald"
    },
    {
      id: "verified_identity",
      title: getT("verifiedIdentity", "Verified Identity"),
      desc: getT("verifiedIdentityDesc", "Attain official administrative verification badge by EuroNova commanders."),
      icon: BadgeCheck,
      isUnlocked: role === "org" 
        ? op.verification_status === "verified"
        : yp.verification_status === "verified",
      progressText: (role === "org" ? op.verification_status : yp.verification_status) === "verified" ? "Verified" : "Pending Admin",
      glowColor: "plasma-cyan"
    },
    {
      id: "mission_hoarder",
      title: getT("missionHoarder", "Mission Hoarder"),
      desc: getT("missionHoarderDesc", "Save 20 or more projects to your mission radar."),
      icon: BookmarkCheck,
      isUnlocked: savedProjectsCount >= 20,
      progressText: `${savedProjectsCount} / 20 saved`,
      glowColor: "hyper-violet"
    },
    {
      id: "serial_applicant",
      title: getT("serialApplicant", "Serial Applicant"),
      desc: getT("serialApplicantDesc", "Apply to 5 or more European mobility projects."),
      icon: Zap,
      isUnlocked: appliedProjectsCount >= 5,
      progressText: `${appliedProjectsCount} / 5 applied`,
      glowColor: "nova-flare"
    },
    {
      id: "the_archivist",
      title: getT("theArchivist", "The Archivist"),
      desc: getT("theArchivistDesc", "Organize your radar by creating 3 or more custom collections."),
      icon: FolderArchive,
      isUnlocked: customFoldersCount >= 3,
      progressText: `${customFoldersCount} / 3 folders`,
      glowColor: "plasma-cyan"
    },
    {
      id: "polyglot",
      title: getT("polyglot", "Polyglot"),
      desc: getT("polyglotDesc", "Master of 4 or more European languages in your profile."),
      icon: Languages,
      isUnlocked: languagesList.length >= 4,
      progressText: `${languagesList.length} / 4 languages`,
      glowColor: "hyper-violet"
    },
    {
      id: "veteran_explorer",
      title: getT("veteranExplorer", "Veteran Explorer"),
      desc: getT("veteranExplorerDesc", "Active EuroNova account for over 90 days in orbit."),
      icon: Clock,
      isUnlocked: accountAgeDays >= 90,
      progressText: `${accountAgeDays} / 90 days`,
      glowColor: "yellow"
    },
    {
      id: "social_butterfly",
      title: getT("socialButterfly", "Social Butterfly"),
      desc: getT("socialButterflyDesc", "Broadcast missions to peers by sharing projects 10 or more times."),
      icon: Share2,
      isUnlocked: sharedProjectsCount >= 10,
      progressText: `${sharedProjectsCount} / 10 shares`,
      glowColor: "hyper-violet"
    },
    {
      id: "green_voyager",
      title: getT("greenVoyager", "Green Voyager"),
      desc: getT("greenVoyagerDesc", "Interact with or apply to an official Green Travel mobility project."),
      icon: Leaf,
      isUnlocked: hasGreenTravelInteraction,
      progressText: hasGreenTravelInteraction ? "Green Validated" : "No Green Mission",
      glowColor: "rup-emerald"
    },
    {
      id: "youth_ambassador",
      title: getT("youthAmbassador", "Youth Ambassador"),
      desc: getT("youthAmbassadorDesc", "Recruit and refer 3 or more fellow European volunteers."),
      icon: Award,
      isUnlocked: referralCount >= 3,
      progressText: `${referralCount} / 3 referrals`,
      glowColor: "plasma-cyan"
    }
  ];

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  return (
    <div className="max-w-3xl mx-auto mt-4 sm:mt-8 px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mb-6">
        <Breadcrumbs
          items={
            role === "org"
              ? [
                  { label: "Organization Command Center", href: `/${locale}/dashboard/organizations/${user.id}` },
                  { label: t("title") || "Profile" }
                ]
              : [{ label: t("title") || "Profile" }]
          }
        />
      </div>
      
      <div className="bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow de fondo según rol */}
        {role === "youth" ? (
          <div className="absolute top-0 right-0 w-64 h-64 bg-plasma-cyan/5 rounded-full blur-[80px] pointer-events-none" />
        ) : (
          <div className="absolute top-0 right-0 w-64 h-64 bg-hyper-violet/5 rounded-full blur-[80px] pointer-events-none" />
        )}

        <div className="flex items-center gap-4 mb-8 border-b border-void-border pb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
            role === "youth" ? "bg-plasma-cyan/20 text-plasma-cyan" : "bg-hyper-violet/20 text-hyper-violet"
          }`}>
            {role === "youth" ? <User className="w-7 h-7" /> : <Building className="w-7 h-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t('title')}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {role === "youth" 
                ? t('youthDesc') 
                : t('orgDesc')}
            </p>
          </div>
        </div>

        {/* LEVEL 10+ GAMIFICATION HOOK: SUPPORT SPECIALIST RECRUITMENT BANNER */}
        {role === "youth" && isLevel10Plus && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-void-surface via-void-surface/95 to-rup-emerald/10 border border-rup-emerald/50 shadow-[0_0_35px_rgba(0,230,118,0.2)] relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute top-0 right-0 w-72 h-72 bg-rup-emerald/10 rounded-full blur-[90px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rup-emerald/15 border border-rup-emerald/40 flex items-center justify-center text-rup-emerald shrink-0 shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                  <Headphones className="w-7 h-7 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_10px_rgba(0,230,118,0.3)]">
                      Level 10 Vanguard Milestone
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      Level {userLevel} · {format.number(userXp)} XP
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Invitation: Join the EuroNova Staff as a Support Specialist!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl font-light">
                    You have demonstrated exceptional dedication to the European mobility community. As a Level 10+ veteran, you are officially invited to apply for the <strong className="text-rup-emerald font-semibold">Support Specialist</strong> role to guide incoming youth, answer inquiries, and unlock platform staff credentials.
                  </p>
                </div>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                <Link
                  href={`/${locale}/dashboard/support?reason=apply_support`}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rup-emerald hover:bg-rup-emerald/90 text-void-deep font-black text-xs sm:text-sm transition-all shadow-[0_0_25px_rgba(0,230,118,0.4)] hover:scale-105 cursor-pointer uppercase tracking-wider"
                >
                  <Headphones className="w-4 h-4" />
                  <span>Apply for Support Role</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* DYNAMIC PROFILE COMPLETION PROGRESS BAR (Only for Youth Volunteers) */}
        {role === "youth" && (
          <div className="mb-8 p-4 sm:p-5 rounded-xl bg-void-deep/90 border border-plasma-cyan/30 shadow-[0_0_20px_rgba(0,229,255,0.06)]">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>{getT("profileCompletion", "Profile Completion")}</span>
              </span>
              <span className="text-xs font-extrabold text-plasma-cyan bg-plasma-cyan/10 border border-plasma-cyan/30 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                {completionPercentage}%
              </span>
            </div>

            {/* Glowing Dynamic Progress Track */}
            <div className="w-full h-3 bg-void-surface rounded-full overflow-hidden border border-void-border p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-plasma-cyan via-hyper-violet to-plasma-cyan rounded-full shadow-[0_0_14px_rgba(0,229,255,0.7)] transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(completionPercentage, 5)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2.5">
              <span>{getT("profileCompletionDesc", "Complete your youth or organization dossier to unlock priority matching.")}</span>
              <span className="font-mono text-plasma-cyan/90 shrink-0 ml-2">{unlockedCount}/12 badges</span>
            </div>
          </div>
        )}

        {/* Formulario de perfil con Danger Zone integrada */}
        <ProfileForm 
          key={profileData ? JSON.stringify(profileData) : "empty"} 
          initialData={profileData} 
          role={role} 
        />

        {/* NGO COMMAND CENTER GATEWAY (Professional View for NGOs) */}
        {role === "org" && (
          <div className="mt-8 p-6 rounded-2xl bg-void-deep/90 border border-hyper-violet/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(99,102,241,0.12)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rup-emerald animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Organization Command Center
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                Manage your missions, squad members, webhooks, analytics, and surveys.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <Link
                href={`/${locale}/dashboard/organizations/${user.id}`}
                className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-hyper-violet hover:bg-hyper-violet/90 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building className="w-4 h-4" />
                <span>Open Command Center</span>
              </Link>
            </div>
          </div>
        )}

        {/* YOUTH GAMIFICATION MODULES (Hidden completely for Organizations) */}
        {role === "youth" && (
          <>
            {/* INFINITE LEVELING & TRUST MODULE */}
            <div className="mt-12 pt-8 border-t border-void-border">
              <LevelReputationModule
                xp={typeof profileData?.xp === "number" ? profileData.xp : 0}
                trustScore={typeof profileData?.trust_score === "number" ? profileData.trust_score : 30}
                role={role}
              />
            </div>

            {/* EXPANDED ACHIEVEMENTS GAMIFICATION SECTION */}
            <div className="mt-8 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-plasma-cyan">✦</span>
                    <span>{getT("privateAchievements", "Private Achievements")}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {getT("privateAchievementsDesc", "Exclusive badges unlocked through your mobility journey. Visible only to you.")}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-void-deep border border-void-border text-[11px] font-bold text-gray-300 shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse" />
                  <span>{unlockedCount} / {achievements.length} Unlocked</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {achievements.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div 
                      key={badge.id}
                      className={`p-4 rounded-xl transition-all duration-300 flex items-start gap-3.5 relative ${
                        badge.isUnlocked
                          ? "bg-void-deep/90 border border-plasma-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.18)] hover:shadow-[0_0_22px_rgba(0,229,255,0.3)] hover:border-plasma-cyan/70"
                          : "bg-void-deep/30 border border-dashed border-void-border/70 grayscale opacity-45 hover:opacity-75 hover:grayscale-0"
                      }`}
                    >
                      {/* Badge Icon Wrapper */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                        badge.isUnlocked
                          ? "bg-plasma-cyan/15 border border-plasma-cyan/50 text-plasma-cyan shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                          : "bg-void-surface border border-void-border text-gray-500 relative"
                      }`}>
                        <Icon className="w-5 h-5" />
                        {!badge.isUnlocked && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-void-deep border border-void-border">
                            <Lock className="w-2.5 h-2.5 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Badge Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs font-bold truncate ${badge.isUnlocked ? "text-white" : "text-gray-400"}`}>
                            {badge.title}
                          </h4>
                          {badge.isUnlocked ? (
                            <span className="text-[9px] font-black tracking-wider text-rup-emerald bg-rup-emerald/10 border border-rup-emerald/30 px-1.5 py-0.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,230,118,0.2)]">
                              {getT("unlocked", "UNLOCKED")}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-500 bg-void-deep border border-void-border px-1.5 py-0.5 rounded-full shrink-0">
                              {getT("locked", "LOCKED")} {badge.progressText ? `(${badge.progressText})` : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                          {badge.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* RECENTLY VIEWED MISSIONS */}
        <div className="mt-12 pt-8 border-t border-void-border">
          <RecentlyViewedMissions userId={user?.id} />
        </div>
      </div>
    </div>
  );
}

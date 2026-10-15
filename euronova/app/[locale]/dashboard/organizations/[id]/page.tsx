/* eslint-disable @next/next/no-img-element */
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { 
  Building, 
  MapPin, 
  Globe, 
  Mail, 
  Camera, 
  Music, 
  PlaySquare, 
  Briefcase, 
  Star, 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  MessageSquare, 
  Rocket,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { COUNTRIES } from "@/lib/constants/countries";
import { ReviewForm } from "@/components/ReviewForm";
import { ProjectCard, ProjectData } from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

interface OrganizationDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrganizationDetailPage(props: OrganizationDetailPageProps) {
  const { id } = await props.params;
  const searchParams = (await props.searchParams) || {};
  const supabase = await createClient();
  const t = await getTranslations("OrgReviews");
  const tOrg = await getTranslations("Organizations");

  // Paginación independiente para reseñas y proyectos (50 elementos por página)
  const REVIEWS_PER_PAGE = 50;
  const PROJECTS_PER_PAGE = 50;

  const rPageParam = searchParams.r_page ?? searchParams.reviews_page;
  const parsedRevPage = parseInt(Array.isArray(rPageParam) ? rPageParam[0] : (rPageParam || "1"), 10);
  const revPage = isNaN(parsedRevPage) || parsedRevPage < 1 ? 1 : parsedRevPage;

  const pPageParam = searchParams.p_page ?? searchParams.projects_page;
  const parsedProjPage = parseInt(Array.isArray(pPageParam) ? pPageParam[0] : (pPageParam || "1"), 10);
  const projPage = isNaN(parsedProjPage) || parsedProjPage < 1 ? 1 : parsedProjPage;

  const revFrom = (revPage - 1) * REVIEWS_PER_PAGE;
  const revTo = revFrom + REVIEWS_PER_PAGE - 1;

  const projFrom = (projPage - 1) * PROJECTS_PER_PAGE;
  const projTo = projFrom + PROJECTS_PER_PAGE - 1;

  // 1. Obtener la Organización
  const { data: org, error: orgError } = await supabase
    .from("users_org")
    .select("*")
    .eq("id", id)
    .single();

  if (orgError || !org) {
    notFound();
  }

  // 2. Obtener todas las calificaciones de reseñas para cálculo global de promedio
  const { data: allReviewsRatings } = await supabase
    .from("org_reviews")
    .select("rating")
    .eq("org_id", id);

  const totalReviews = allReviewsRatings?.length || 0;
  const averageRating = totalReviews > 0
    ? (allReviewsRatings!.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
    : "0.0";

  // Obtener las reseñas paginadas (50 items max) con información del autor
  const { data: rawReviews, count: paginatedReviewsCount, error: reviewsError } = await supabase
    .from("org_reviews")
    .select(`
      id,
      rating,
      review_text,
      created_at,
      author_id,
      users_youth (
        full_name,
        country_code
      )
    `, { count: "exact" })
    .eq("org_id", id)
    .order("created_at", { ascending: false })
    .range(revFrom, revTo);

  if (reviewsError) {
    console.error("Error fetching org reviews:", reviewsError);
  }

  type ReviewItem = {
    id: string;
    rating: number;
    review_text: string;
    created_at: string;
    author_id: string;
    users_youth: {
      full_name?: string;
      country_code?: string;
    } | {
      full_name?: string;
      country_code?: string;
    }[] | null;
  };

  const reviews = (rawReviews as unknown as ReviewItem[] | null) || [];
  const totalReviewsCount = paginatedReviewsCount ?? totalReviews;
  const totalReviewPages = Math.max(1, Math.ceil(totalReviewsCount / REVIEWS_PER_PAGE));

  // 3. Obtener proyectos activos de la organización paginados (50 items max)
  const { data: rawProjects, count: paginatedProjectsCount, error: projectsError } = await supabase
    .from("projects")
    .select("*, users_org(org_name, verification_status)", { count: "exact" })
    .eq("org_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(projFrom, projTo);

  if (projectsError) {
    console.error("Error fetching org projects:", projectsError);
  }

  const totalProjects = paginatedProjectsCount || 0;
  const totalProjectPages = Math.max(1, Math.ceil(totalProjects / PROJECTS_PER_PAGE));

  // 4. Obtener interacciones del usuario autenticado si existe
  const { data: { user } } = await supabase.auth.getUser();
  let userInteractions: { project_id: string; is_favorite: boolean; is_applied: boolean }[] = [];
  if (user) {
    const { data: interactions } = await supabase
      .from("user_project_interactions")
      .select("project_id, is_favorite, is_applied")
      .eq("user_id", user.id);

    if (interactions) {
      userInteractions = interactions;
    }
  }

  const interactionsMap = new Map(
    userInteractions.map((item) => [item.project_id, item])
  );

  const countryInfo = COUNTRIES.find((c) => c.code === org.country_hq);
  const logoUrl = org.logo_url || org.avatar_url;

  const orgRecord = org as unknown as Record<string, unknown>;
  const picValue = (orgRecord.pic as string | null | undefined) || (orgRecord.pic_number as string | null | undefined) || null;
  const oidValue = (orgRecord.oid as string | null | undefined) || (orgRecord.oid_number as string | null | undefined) || null;

  // Generador de URLs preservando páginas independientes
  function buildOrgUrl(paramsToUpdate: { p_page?: number; r_page?: number }) {
    const params = new URLSearchParams();
    const nextP = paramsToUpdate.p_page !== undefined ? paramsToUpdate.p_page : projPage;
    const nextR = paramsToUpdate.r_page !== undefined ? paramsToUpdate.r_page : revPage;
    if (nextP > 1) params.set("p_page", nextP.toString());
    if (nextR > 1) params.set("r_page", nextR.toString());
    const qs = params.toString();
    return `/dashboard/organizations/${id}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 overflow-hidden sm:overflow-visible">
      {/* Botón de retorno */}
      <div className="mb-2">
        <Link
          href="/dashboard/organizations"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{tOrg("directory")}</span>
        </Link>
      </div>

      {/* Cabecera Principal de la Organización */}
      <div className="relative overflow-hidden rounded-3xl border border-void-border bg-void-surface/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-hyper-violet/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {picValue && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-hyper-violet/20 border border-hyper-violet/40 text-hyper-violet uppercase tracking-wider">
                  PIC: {picValue}
                </span>
              )}
              {oidValue && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-plasma-cyan/20 border border-plasma-cyan/40 text-plasma-cyan uppercase tracking-wider">
                  OID: {oidValue}
                </span>
              )}
              {org.verification_status === "verified" && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rup-emerald/20 border border-rup-emerald/40 text-rup-emerald flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {tOrg("verified")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={org.org_name || "Organization Logo"}
                  className="w-16 h-16 rounded-xl object-cover bg-void-deep border border-void-border shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-void-deep border border-void-border flex items-center justify-center shrink-0">
                  <Building className="w-8 h-8 text-hyper-violet" />
                </div>
              )}
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight break-words">
                {org.org_name || tOrg("unnamedOrg")}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <MapPin className="w-4 h-4 text-plasma-cyan shrink-0" />
              {countryInfo ? (
                <span className="flex items-center gap-2">
                  <img
                    src={countryInfo.flagUrl}
                    alt={countryInfo.name}
                    className="w-4 h-auto rounded-[2px]"
                  />
                  <span>{countryInfo.name}</span>
                </span>
              ) : (
                <span>{org.country_hq || tOrg("countryNotSpecified")}</span>
              )}
            </div>

            <p className="text-gray-300 text-sm sm:text-base max-w-3xl leading-relaxed pt-2 break-words">
              {org.description || tOrg("noDescription")}
            </p>
          </div>

          {/* Tarjeta de Calificación y Reputación */}
          <div className="shrink-0 bg-void-deep/90 border border-void-border rounded-2xl p-5 flex flex-col items-center justify-center min-w-[200px] text-center shadow-inner self-stretch md:self-auto w-full md:w-auto">
            <div className="text-4xl font-black text-white tracking-tight flex items-center gap-1">
              <span>{averageRating}</span>
              <span className="text-xl text-gray-500 font-medium">/ 5.0</span>
            </div>
            
            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(Number(averageRating))
                      ? "text-plasma-cyan fill-plasma-cyan"
                      : "text-gray-600"
                  }`}
                />
              ))}
            </div>

            <span className="text-xs font-semibold text-gray-400">
              {totalReviews} {t("totalReviews")}
            </span>
          </div>
        </div>

        {/* Canales de Contacto y Redes */}
        {(() => {
          const website = typeof org.website === "string" && org.website.trim() ? org.website.trim() : null;
          const instagram = typeof org.social_instagram === "string" && org.social_instagram.trim() ? org.social_instagram.trim() : null;
          const tiktok = typeof org.social_tiktok === "string" && org.social_tiktok.trim() ? org.social_tiktok.trim() : null;
          const youtube = typeof org.social_youtube === "string" && org.social_youtube.trim() ? org.social_youtube.trim() : null;
          const linkedin = typeof org.social_linkedin === "string" && org.social_linkedin.trim() ? org.social_linkedin.trim() : null;
          const email = typeof org.contact_email === "string" && org.contact_email.trim() ? org.contact_email.trim() : null;

          if (!website && !instagram && !tiktok && !youtube && !linkedin && !email) return null;

          return (
            <div className="mt-4 pt-4 border-t border-void-border/70 flex flex-row items-center gap-2 sm:gap-3 flex-wrap">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan hover:bg-plasma-cyan hover:text-void-deep text-xs font-semibold transition-all shadow-[0_0_10px_rgba(0,229,255,0.1)] shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{email}</span>
                </a>
              )}
              {website && (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all shrink-0"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website</span>
                </a>
              )}
              {instagram && (
                <a
                  href={instagram.startsWith("http") ? instagram : `https://${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Instagram</span>
                </a>
              )}
              {tiktok && (
                <a
                  href={tiktok.startsWith("http") ? tiktok : `https://${tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all shrink-0"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>TikTok</span>
                </a>
              )}
              {youtube && (
                <a
                  href={youtube.startsWith("http") ? youtube : `https://${youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all shrink-0"
                >
                  <PlaySquare className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </a>
              )}
              {linkedin && (
                <a
                  href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all shrink-0"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          );
        })()}
      </div>

      {/* Sección de Reputación y Reseñas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Formulario de Reseña */}
        <div className="lg:col-span-1">
          <ReviewForm orgId={id} />
        </div>

        {/* Columna Derecha: Listado de Reseñas Existentes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-void-border">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-hyper-violet" />
              <span>{t("title")}</span>
            </h2>
            <span className="text-xs font-semibold text-gray-400">
              {totalReviews} {t("totalReviews")}
            </span>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((rev) => {
                const youth = Array.isArray(rev.users_youth)
                  ? rev.users_youth[0] || {}
                  : rev.users_youth || {};
                const authorName = youth.full_name || "Verified Participant";
                const authorCountry = youth.country_code ? COUNTRIES.find((c) => c.code === youth.country_code) : null;
                const formattedDate = new Date(rev.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={rev.id}
                    className="bg-void-surface border border-void-border rounded-2xl p-5 space-y-3 hover:border-hyper-violet/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{authorName}</span>
                          {authorCountry && (
                            <img
                              src={authorCountry.flagUrl}
                              alt={authorCountry.name}
                              title={authorCountry.name}
                              className="w-4 h-auto rounded-[2px]"
                            />
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                            {t("verifiedYouthBadge")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {/* Estrellas de la reseña */}
                      <div className="flex items-center gap-0.5 bg-void-deep px-2.5 py-1 rounded-lg border border-void-border shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating
                                ? "text-plasma-cyan fill-plasma-cyan"
                                : "text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed pt-1 break-words">
                      {rev.review_text}
                    </p>
                  </div>
                );
              })}

              {/* Controles de Paginación para Reseñas (>50 items) */}
              {totalReviewPages > 1 && (
                <div className="pt-6 border-t border-void-border flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-3">
                    {revPage <= 1 ? (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface/40 text-gray-600 text-sm font-medium cursor-not-allowed select-none"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>{t("previous")}</span>
                      </button>
                    ) : (
                      <Link
                        href={buildOrgUrl({ r_page: revPage - 1 })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all"
                      >
                        <ChevronLeft className="w-4 h-4 text-plasma-cyan" />
                        <span>{t("previous")}</span>
                      </Link>
                    )}

                    <div className="px-4 py-2 rounded-lg border border-void-border bg-void-deep text-xs font-semibold text-plasma-cyan tracking-wider">
                      {t("pageOf", {
                        current: revPage,
                        total: totalReviewPages,
                      })}
                    </div>

                    {revPage >= totalReviewPages ? (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface/40 text-gray-600 text-sm font-medium cursor-not-allowed select-none"
                      >
                        <span>{t("next")}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <Link
                        href={buildOrgUrl({ r_page: revPage + 1 })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all"
                      >
                        <span>{t("next")}</span>
                        <ChevronRight className="w-4 h-4 text-plasma-cyan" />
                      </Link>
                    )}
                  </div>

                  <span className="text-xs text-gray-500 font-medium">
                    {t("showingResults", {
                      from: totalReviewsCount === 0 ? 0 : revFrom + 1,
                      to: Math.min(revTo + 1, totalReviewsCount),
                      total: totalReviewsCount,
                    })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40 p-6">
              <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">{t("noReviewsYet")}</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">{t("beTheFirst")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sección de Misiones Activas de esta Organización */}
      {totalProjects > 0 && (
        <div className="space-y-6 pt-6 border-t border-void-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="w-6 h-6 text-plasma-cyan" />
              <h2 className="text-2xl font-black text-white tracking-tight">
                {t("activeMissions")}
              </h2>
            </div>
            <span className="text-xs font-semibold text-gray-400">
              {totalProjects} {totalProjects === 1 ? "mission" : "missions"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rawProjects?.map((proj) => {
              const interaction = interactionsMap.get(proj.id);
              const projectData: ProjectData = {
                id: proj.id,
                title: proj.title,
                project_type: proj.project_type,
                dest_country: proj.dest_country,
                min_age: proj.min_age,
                max_age: proj.max_age,
                covers_rup_flights: proj.covers_rup_flights,
                is_last_minute: proj.is_last_minute,
                themes: proj.themes,
                duration_days: proj.duration_days,
                travel_budget_min: proj.travel_budget_min,
                travel_budget_max: proj.travel_budget_max,
                financing_type: proj.financing_type,
                org_name: org.org_name,
                verification_status: org.verification_status,
                is_favorite: interaction?.is_favorite ?? false,
                is_applied: interaction?.is_applied ?? false,
              };

              return (
                <div key={proj.id} className="h-full">
                  <ProjectCard project={projectData} />
                </div>
              );
            })}
          </div>

          {/* Controles de Paginación para Proyectos (>50 items) */}
          {totalProjectPages > 1 && (
            <div className="pt-6 border-t border-void-border flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-3">
                {projPage <= 1 ? (
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface/40 text-gray-600 text-sm font-medium cursor-not-allowed select-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t("previous")}</span>
                  </button>
                ) : (
                  <Link
                    href={buildOrgUrl({ p_page: projPage - 1 })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-plasma-cyan" />
                    <span>{t("previous")}</span>
                  </Link>
                )}

                <div className="px-4 py-2 rounded-lg border border-void-border bg-void-deep text-xs font-semibold text-plasma-cyan tracking-wider">
                  {t("pageOf", {
                    current: projPage,
                    total: totalProjectPages,
                  })}
                </div>

                {projPage >= totalProjectPages ? (
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface/40 text-gray-600 text-sm font-medium cursor-not-allowed select-none"
                  >
                    <span>{t("next")}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href={buildOrgUrl({ p_page: projPage + 1 })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all"
                  >
                    <span>{t("next")}</span>
                    <ChevronRight className="w-4 h-4 text-plasma-cyan" />
                  </Link>
                )}
              </div>

              <span className="text-xs text-gray-500 font-medium">
                {t("showingProjects", {
                  from: totalProjects === 0 ? 0 : projFrom + 1,
                  to: Math.min(projTo + 1, totalProjects),
                  total: totalProjects,
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  UserCheck, 
  MessageSquare, 
  Rocket 
} from "lucide-react";
import { COUNTRIES } from "@/lib/constants/countries";
import { ReviewForm } from "@/components/ReviewForm";
import { ProjectCard, ProjectData } from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

interface OrganizationDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function OrganizationDetailPage(props: OrganizationDetailPageProps) {
  const { id } = await props.params;
  const supabase = await createClient();
  const t = await getTranslations("OrgReviews");
  const tOrg = await getTranslations("Organizations");

  // 1. Obtener la Organización
  const { data: org, error: orgError } = await supabase
    .from("users_org")
    .select("*")
    .eq("id", id)
    .single();

  if (orgError || !org) {
    notFound();
  }

  // 2. Obtener las reseñas con datos del autor
  const { data: rawReviews, error: reviewsError } = await supabase
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
    `)
    .eq("org_id", id)
    .order("created_at", { ascending: false });

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
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : "0.0";

  // 3. Obtener proyectos activos de la organización
  const { data: rawProjects } = await supabase
    .from("projects")
    .select("*, users_org(org_name, verification_status)")
    .eq("org_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const countryInfo = COUNTRIES.find((c) => c.code === org.country_hq);

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-hyper-violet/20 border border-hyper-violet/40 text-hyper-violet uppercase tracking-wider">
                PIC: {org.pic_number}
              </span>
              {org.verification_status === "verified" && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rup-emerald/20 border border-rup-emerald/40 text-rup-emerald flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {tOrg("verified")}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Building className="w-8 h-8 text-hyper-violet shrink-0" />
              <span>{org.org_name || tOrg("unnamedOrg")}</span>
            </h1>

            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <MapPin className="w-4 h-4 text-plasma-cyan" />
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

            <p className="text-gray-300 text-sm sm:text-base max-w-3xl leading-relaxed pt-2">
              {org.description || tOrg("noDescription")}
            </p>
          </div>

          {/* Tarjeta de Calificación y Reputación */}
          <div className="shrink-0 bg-void-deep/90 border border-void-border rounded-2xl p-5 flex flex-col items-center justify-center min-w-[200px] text-center shadow-inner">
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
            <div className="mt-6 pt-6 border-t border-void-border flex flex-wrap items-center gap-3">
              {website && (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all"
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all"
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all"
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all"
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-void-deep border border-void-border text-gray-300 hover:text-plasma-cyan hover:border-plasma-cyan text-xs font-semibold transition-all ml-auto"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{email}</span>
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
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{authorName}</span>
                          {authorCountry && (
                            <span className="text-xs" title={authorCountry.name}>
                              {authorCountry.flag}
                            </span>
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
                      <div className="flex items-center gap-0.5 bg-void-deep px-2.5 py-1 rounded-lg border border-void-border">
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

                    <p className="text-sm text-gray-300 leading-relaxed pt-1">
                      {rev.review_text}
                    </p>
                  </div>
                );
              })}
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
      {rawProjects && rawProjects.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-void-border">
          <div className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-plasma-cyan" />
            <h2 className="text-2xl font-black text-white tracking-tight">
              {t("activeMissions")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rawProjects.map((proj) => {
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
              };

              return (
                <div key={proj.id} className="h-full">
                  <ProjectCard project={projectData} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

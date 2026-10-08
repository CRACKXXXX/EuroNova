import { createClient } from "@/utils/supabase/server";
import { Rocket, Calendar, MapPin, Search, ArrowLeft, Euro, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Suspense } from "react";
import { ProjectCard } from "@/components/ProjectCard";

export const dynamic = 'force-dynamic';

export default async function ProjectsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const t = await getTranslations("DashboardContent");
  const supabase = await createClient();

  const q = searchParams.q as string | undefined;
  const dest = searchParams.dest as string | undefined;
  const eligible = searchParams.eligible as string | undefined;
  const types = searchParams.types as string | undefined;
  const targetProfile = searchParams.target_profile as string | undefined;
  const themes = searchParams.themes as string | undefined;
  const duration = searchParams.duration as string | undefined;
  const minBudget = searchParams.min_budget as string | undefined;
  const maxBudget = searchParams.max_budget as string | undefined;
  const maxFee = searchParams.max_fee as string | undefined;
  const accommodation = searchParams.accommodation === "true";
  const rup = searchParams.rup === "true";
  const lastMinute = searchParams.last_minute === "true";
  
  const minAge = searchParams.min_age as string | undefined;
  const maxAge = searchParams.max_age as string | undefined;
  const startDate = searchParams.start_date as string | undefined;
  const endDate = searchParams.end_date as string | undefined;
  const funding = searchParams.funding as string | undefined;

  let query = supabase.from("projects").select("*, users_org(org_name, verification_status)");

  if (q) query = query.ilike("title", `%${q}%`);
  
  // Array filters (if they are passed as comma-separated strings)
  if (dest) {
    const destArr = dest.split(",");
    query = query.in("dest_country", destArr);
  }
  
  if (eligible) {
    const eligibleArr = eligible.split(",");
    query = query.contains("eligible_countries", eligibleArr);
  }

  if (types) {
    const typesArr = types.split(",");
    query = query.in("project_type", typesArr);
  }

  if (targetProfile) {
    query = query.eq("target_profile", targetProfile);
  }

  if (themes) {
    const themesArr = themes.split(",");
    query = query.contains("themes", themesArr);
  }

  if (duration) query = query.lte("duration_days", parseInt(duration));
  if (minBudget) query = query.gte("travel_budget_min", parseInt(minBudget));
  if (maxBudget) query = query.lte("travel_budget_max", parseInt(maxBudget));
  if (maxFee) query = query.lte("participation_fee", parseInt(maxFee));
  if (accommodation) query = query.eq("accommodation_covered", true);
  if (rup) query = query.eq("covers_rup_flights", true);
  if (lastMinute) query = query.eq("is_last_minute", true);
  if (minAge) query = query.lte("min_age", parseInt(minAge));
  if (maxAge) query = query.gte("max_age", parseInt(maxAge));
  if (startDate) query = query.gte("start_date", startDate);
  if (endDate) query = query.lte("end_date", endDate);
  if (funding) query = query.eq("funding_type", funding);

  const { data: projects, error } = await query;

  if (error) {
    console.error("Error al obtener proyectos:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="mb-2">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t("backHome")}</span>
        </Link>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
            <Rocket className="w-8 h-8 text-plasma-cyan" /> 
            {t('transmissionsReceived')}
          </h2>
          <p className="text-gray-400 mt-2">{t("exploreMissions")}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-8">
        {/* Filtros a la izquierda */}
        <div className="w-full lg:w-72 shrink-0">
          <Suspense fallback={<div className="h-96 rounded-xl bg-void-surface animate-pulse" />}>
            <DashboardSidebar />
          </Suspense>
        </div>

        {/* Resultados a la derecha */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
        {projects && projects.length > 0 ? (
          projects.map((project: any) => {
            const org = project.users_org || {};
            const projectData = {
              ...project,
              org_name: org.org_name,
              verification_status: org.verification_status,
            };
            return (
              <div key={project.id} className="h-full">
                <ProjectCard project={projectData} />
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/50">
            <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('waitingTransmissions')}</h3>
            <p className="text-gray-400">{t('adjustFilters')}</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

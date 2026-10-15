import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { 
  Rocket, 
  ArrowLeft, 
  Compass, 
  Sparkles
} from "lucide-react";
import { MyMissionsClient, MissionInteraction } from "./MyMissionsClient";

export const dynamic = "force-dynamic";

interface MyMissionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MyMissionsPage(props: MyMissionsPageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const t = await getTranslations("MyMissions");

  // 1. Verificación de Autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. Parámetros de vista y filtros iniciales
  const tabParam = Array.isArray(searchParams.tab) ? searchParams.tab[0] : searchParams.tab;
  const activeTab: "saved" | "applied" = tabParam === "applied" ? "applied" : "saved";

  const typeParam = Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type;
  const selectedType = typeParam || "ALL";

  const destParam = Array.isArray(searchParams.dest) ? searchParams.dest[0] : searchParams.dest;
  const selectedDest = destParam || "";

  const queryParam = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const searchQuery = queryParam || "";

  const sPageParam = Array.isArray(searchParams.s_page) ? searchParams.s_page[0] : searchParams.s_page;
  const initialSavedPage = parseInt(sPageParam || "1", 10) || 1;

  const aPageParam = Array.isArray(searchParams.a_page) ? searchParams.a_page[0] : searchParams.a_page;
  const initialAppliedPage = parseInt(aPageParam || "1", 10) || 1;

  // 3. Consulta de interacciones del usuario con proyectos y organizaciones
  const { data: rawInteractions, error } = await supabase
    .from("user_project_interactions")
    .select(`
      project_id,
      is_favorite,
      is_applied,
      updated_at,
      projects (
        id,
        title,
        project_type,
        dest_country,
        min_age,
        max_age,
        covers_rup_flights,
        is_last_minute,
        themes,
        duration_days,
        travel_budget_min,
        travel_budget_max,
        financing_type,
        users_org (
          org_name,
          verification_status
        )
      )
    `)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching mission tracking:", error);
  }

  const interactions = (rawInteractions as unknown as MissionInteraction[] | null) || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Navegación de retorno */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t("backCommandCenter")}</span>
        </Link>

        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan text-xs font-semibold transition-all"
        >
          <Compass className="w-3.5 h-3.5 text-plasma-cyan" />
          <span>{t("exploreMissions")}</span>
        </Link>
      </div>

      {/* Cabecera Principal */}
      <div className="relative overflow-hidden rounded-2xl border border-void-border bg-void-surface/60 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-hyper-violet/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-plasma-cyan/30 bg-plasma-cyan/10 text-plasma-cyan text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mission Tracker</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Rocket className="w-8 h-8 text-plasma-cyan" />
            {t("title")}
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base max-w-2xl">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Cliente interactivo con filtros rápidos por tipo y paginación independiente de 50 items */}
      <MyMissionsClient
        initialInteractions={interactions}
        initialTab={activeTab}
        initialType={selectedType}
        initialDest={selectedDest}
        initialQuery={searchQuery}
        initialSavedPage={initialSavedPage}
        initialAppliedPage={initialAppliedPage}
      />
    </div>
  );
}

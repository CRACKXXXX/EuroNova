import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { 
  Bookmark, 
  Send, 
  Rocket, 
  ArrowLeft, 
  Compass, 
  CheckCircle2, 
  Sparkles,
  Search,
  MapPin,
  Filter
} from "lucide-react";
import { ProjectCard, ProjectData } from "@/components/ProjectCard";
import { COUNTRIES } from "@/lib/constants/countries";
import { PROJECT_TYPES } from "@/lib/constants/projectTypes";

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

  // 2. Parámetros de vista y filtros
  const activeTab = (searchParams.tab as string) === "applied" ? "applied" : "saved";
  const searchQuery = ((searchParams.q as string) || "").trim().toLowerCase();
  const selectedDest = (searchParams.dest as string) || "";
  const selectedType = (searchParams.type as string) || "";

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

  // 4. Mapeo defensivo de proyectos
  type RawInteraction = {
    project_id: string;
    is_favorite: boolean;
    is_applied: boolean;
    updated_at: string;
    projects: {
      id: string;
      title: string;
      project_type: string;
      dest_country: string;
      min_age: number;
      max_age: number;
      covers_rup_flights: boolean;
      is_last_minute: boolean;
      themes: string[] | null;
      duration_days?: number;
      travel_budget_min?: number | null;
      travel_budget_max?: number | null;
      financing_type?: string;
      users_org?: {
        org_name?: string;
        verification_status?: string;
      } | {
        org_name?: string;
        verification_status?: string;
      }[] | null;
    } | null;
  };

  const interactions = (rawInteractions as unknown as RawInteraction[] | null) || [];

  // Filtrar interacciones válidas con proyectos existentes
  const validInteractions = interactions.filter(
    (item) => item.projects && typeof item.projects === "object"
  );

  const savedList = validInteractions.filter((item) => item.is_favorite);
  const appliedList = validInteractions.filter((item) => item.is_applied);

  // Seleccionar lista según la pestaña activa
  const currentList = activeTab === "applied" ? appliedList : savedList;

  // Filtrar por término de búsqueda, país y tipo si se seleccionaron
  const filteredList = currentList.filter((item) => {
    const proj = item.projects;
    if (!proj) return false;
    if (searchQuery && !proj.title.toLowerCase().includes(searchQuery)) return false;
    if (selectedDest && proj.dest_country !== selectedDest) return false;
    if (selectedType && proj.project_type !== selectedType) return false;
    return true;
  });

  // Función para construir URLs preservando parámetros
  function buildFilterUrl(paramsToUpdate: { tab?: string; dest?: string; type?: string; q?: string }) {
    const nextParams = new URLSearchParams();
    const tabVal = paramsToUpdate.tab !== undefined ? paramsToUpdate.tab : activeTab;
    const destVal = paramsToUpdate.dest !== undefined ? paramsToUpdate.dest : selectedDest;
    const typeVal = paramsToUpdate.type !== undefined ? paramsToUpdate.type : selectedType;
    const qVal = paramsToUpdate.q !== undefined ? paramsToUpdate.q : searchQuery;

    if (tabVal && tabVal !== "saved") nextParams.set("tab", tabVal);
    if (destVal) nextParams.set("dest", destVal);
    if (typeVal) nextParams.set("type", typeVal);
    if (qVal) nextParams.set("q", qVal);

    const queryStr = nextParams.toString();
    return `/dashboard/my-missions${queryStr ? `?${queryStr}` : ""}`;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Navegación de retorno */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Volver al Centro de Mando</span>
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

      {/* Selector de Pestañas (Tabs) y Barra de Búsqueda */}
      <div className="flex flex-col gap-5 border-b border-void-border pb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Pestañas Principales */}
          <div className="flex items-center gap-3">
            {/* Tab Guardados */}
            <Link
              href={buildFilterUrl({ tab: "saved" })}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                activeTab === "saved"
                  ? "bg-plasma-cyan/15 border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${activeTab === "saved" ? "text-plasma-cyan" : "text-gray-400"}`} />
              <span>{t("tabSaved")}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "saved"
                    ? "bg-plasma-cyan text-void-deep"
                    : "bg-void-border text-gray-300"
                }`}
              >
                {savedList.length}
              </span>
            </Link>

            {/* Tab Aplicados */}
            <Link
              href={buildFilterUrl({ tab: "applied" })}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                activeTab === "applied"
                  ? "bg-hyper-violet/20 border-hyper-violet text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <Send className={`w-4 h-4 ${activeTab === "applied" ? "text-hyper-violet" : "text-gray-400"}`} />
              <span>{t("tabApplied")}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "applied"
                    ? "bg-hyper-violet text-white"
                    : "bg-void-border text-gray-300"
                }`}
              >
                {appliedList.length}
              </span>
            </Link>
          </div>

          {/* Formulario de búsqueda local por texto */}
          <form method="GET" action="/dashboard/my-missions" className="w-full sm:w-72 relative">
            <input type="hidden" name="tab" value={activeTab} />
            {selectedDest && <input type="hidden" name="dest" value={selectedDest} />}
            {selectedType && <input type="hidden" name="type" value={selectedType} />}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search in this list..."
                className="w-full bg-void-surface border border-void-border rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-all"
              />
            </div>
          </form>
        </div>

        {/* Filtros Rápidos (País y Tipo de Proyecto) */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Filtro Todos los Países */}
          <Link
            href={buildFilterUrl({ dest: "" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              !selectedDest
                ? "bg-void-surface border-plasma-cyan/60 text-plasma-cyan"
                : "bg-void-deep border-void-border text-gray-400 hover:text-white"
            }`}
          >
            {t("allCountries")}
          </Link>

          {/* Chips de países presentes en la lista actual */}
          {Array.from(new Set(currentList.map((i) => i.projects?.dest_country).filter(Boolean))).slice(0, 6).map((countryCode) => {
            const countryInfo = COUNTRIES.find((c) => c.code === countryCode);
            const isSelected = selectedDest === countryCode;
            return (
              <Link
                key={countryCode}
                href={buildFilterUrl({ dest: isSelected ? "" : countryCode })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-plasma-cyan/20 border-plasma-cyan text-white shadow-[0_0_10px_rgba(0,229,255,0.15)]"
                    : "bg-void-surface border-void-border text-gray-400 hover:text-white"
                }`}
              >
                {countryInfo?.flag || "🌍"} {countryCode}
              </Link>
            );
          })}

          {/* Filtro Todos los Tipos */}
          <Link
            href={buildFilterUrl({ type: "" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ml-auto ${
              !selectedType
                ? "bg-void-surface border-hyper-violet/60 text-hyper-violet"
                : "bg-void-deep border-void-border text-gray-400 hover:text-white"
            }`}
          >
            {t("allTypes")}
          </Link>

          {PROJECT_TYPES.slice(0, 3).map((pt) => {
            const isSelected = selectedType === pt.code;
            return (
              <Link
                key={pt.code}
                href={buildFilterUrl({ type: isSelected ? "" : pt.code })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-hyper-violet/20 border-hyper-violet text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                    : "bg-void-surface border-void-border text-gray-400 hover:text-white"
                }`}
              >
                {pt.code}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Grid de Proyectos */}
      {filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredList.map((interaction) => {
            const proj = interaction.projects!;
            const org = Array.isArray(proj.users_org)
              ? proj.users_org[0] || {}
              : proj.users_org || {};

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
              is_favorite: interaction.is_favorite,
              is_applied: interaction.is_applied,
            };

            const updatedDate = new Date(interaction.updated_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <div key={proj.id} className="flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    {activeTab === "saved" ? (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-plasma-cyan" />
                        <span>{t("savedOn")} {updatedDate}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-hyper-violet" />
                        <span>{t("appliedOn")} {updatedDate}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex-1">
                  <ProjectCard project={projectData} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Estado Vacío */
        <div className="py-24 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40 p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-void-border bg-void-deep flex items-center justify-center text-gray-500 shadow-inner">
            {activeTab === "saved" ? (
              <Bookmark className="w-8 h-8 text-plasma-cyan/60" />
            ) : (
              <Send className="w-8 h-8 text-hyper-violet/60" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {activeTab === "saved" ? t("noSavedTitle") : t("noAppliedTitle")}
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            {activeTab === "saved" ? t("noSavedDesc") : t("noAppliedDesc")}
          </p>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-plasma-cyan bg-plasma-cyan text-void-deep font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.25)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>{t("exploreMissions")}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Calendar, Euro, MapPin, CheckCircle2, Rocket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ProjectDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-2">
        <Link href="/dashboard/projects" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Volver a Proyectos</span>
        </Link>
      </div>

      <div className="bg-void-surface border border-void-border rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {project.is_last_minute && (
          <div className="absolute top-6 right-6 px-3 py-1.5 bg-nova-flare/20 border border-nova-flare/50 rounded-md text-sm font-bold text-nova-flare uppercase tracking-wider">
            Última Hora
          </div>
        )}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-plasma-cyan/10 rounded-2xl flex items-center justify-center">
            <Rocket className="w-8 h-8 text-plasma-cyan" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white pr-32">{project.title}</h1>
            <p className="text-plasma-cyan font-semibold mt-2 text-lg">{project.mission_type}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-10">
          <div className="flex items-center gap-2 text-gray-300 bg-void-deep px-4 py-2 rounded-xl border border-void-border">
            <MapPin className="w-5 h-5 text-gray-500" />
            <span className="font-medium">{project.country}</span>
          </div>
          {project.duration_days && (
            <div className="flex items-center gap-2 text-gray-300 bg-void-deep px-4 py-2 rounded-xl border border-void-border">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-medium">{project.duration_days} días</span>
            </div>
          )}
          {project.travel_budget && (
            <div className="flex items-center gap-2 text-gray-300 bg-void-deep px-4 py-2 rounded-xl border border-void-border">
              <Euro className="w-5 h-5 text-gray-500" />
              <span className="font-medium">Presupuesto de viaje: {project.travel_budget}€</span>
            </div>
          )}
        </div>

        <div className="prose prose-invert max-w-none mb-10">
          <h3 className="text-xl font-bold text-white mb-4">Descripción del Proyecto</h3>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {project.themes && project.themes.length > 0 && (
            <div className="bg-void-deep p-6 rounded-2xl border border-void-border">
              <h4 className="text-gray-400 font-bold mb-3 uppercase text-xs tracking-wider">Temáticas</h4>
              <div className="flex flex-wrap gap-2">
                {project.themes.map((theme: string) => (
                  <span key={theme} className="px-3 py-1 bg-hyper-violet/10 text-hyper-violet rounded-md text-sm font-medium border border-hyper-violet/20">{theme}</span>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-void-deep p-6 rounded-2xl border border-void-border space-y-4">
            <h4 className="text-gray-400 font-bold mb-3 uppercase text-xs tracking-wider">Detalles Adicionales</h4>
            {project.accommodation_covered && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-rup-emerald" />
                <span className="text-sm text-gray-300 font-medium">Alojamiento cubierto</span>
              </div>
            )}
            {project.is_rup && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-rup-emerald" />
                <span className="text-sm text-gray-300 font-medium">Vuelos cubiertos desde Canarias (RUP)</span>
              </div>
            )}
            {project.funding_type && (
              <div className="flex items-center gap-3">
                <Euro className="w-5 h-5 text-plasma-cyan" />
                <span className="text-sm text-gray-300 font-medium">Financiación: {project.funding_type}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-void-border pt-8 mt-8 flex justify-end">
          <button className="px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-void-deep bg-plasma-cyan hover:bg-plasma-cyan/80 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_30px_rgba(0,229,255,0.6)] text-lg">
            Postular a esta Misión
          </button>
        </div>
      </div>
    </div>
  );
}

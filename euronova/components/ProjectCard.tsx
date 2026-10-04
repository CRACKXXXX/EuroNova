import { MapPin, Calendar, Users, Zap, PlaneTakeoff } from "lucide-react";

export interface ProjectData {
  id: string;
  title: string;
  project_type: string;
  dest_country: string;
  min_age: number;
  max_age: number;
  covers_rup_flights: boolean;
  is_last_minute: boolean;
  themes: string[] | null;
}

export function ProjectCard({ project }: { project: ProjectData }) {
  return (
    <div className="bg-void-surface border border-void-border rounded-2xl overflow-hidden hover:border-plasma-cyan/50 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)] transition-all duration-300 group flex flex-col h-full">
      
      {/* Header section with Badges */}
      <div className="p-5 flex-grow">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-void-border text-gray-300 uppercase tracking-wider">
            {project.project_type}
          </span>
          {project.is_last_minute && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30 flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3" /> ÚLTIMA HORA
            </span>
          )}
          {project.covers_rup_flights && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
              <PlaneTakeoff className="w-3 h-3" /> VUELOS RUP
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-white mb-4 line-clamp-2 group-hover:text-plasma-cyan transition-colors">
          {project.title}
        </h3>

        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-plasma-cyan" />
            <span className="font-medium text-gray-300">{project.dest_country || 'Europa'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-hyper-violet" />
            <span>{project.min_age} - {project.max_age} años</span>
          </div>
        </div>

        {/* Themes */}
        {project.themes && project.themes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.themes.slice(0, 3).map((theme, i) => (
              <span key={i} className="px-2 py-0.5 text-[10px] uppercase font-medium bg-void-deep text-gray-400 rounded-md border border-void-border">
                {theme}
              </span>
            ))}
            {project.themes.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] uppercase font-medium bg-void-deep text-gray-500 rounded-md border border-void-border">
                +{project.themes.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-void-border bg-void-deep/50 mt-auto">
        <button className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-plasma-cyan/10 text-white font-medium text-sm transition-colors border border-transparent hover:border-plasma-cyan/30 flex justify-center items-center gap-2">
          Ver Detalles
        </button>
      </div>
    </div>
  );
}

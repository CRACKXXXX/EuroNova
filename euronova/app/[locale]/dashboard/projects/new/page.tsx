import { ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-2">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Volver al Home</span>
        </Link>
      </div>
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <PlusCircle className="w-8 h-8 text-plasma-cyan" /> 
          Publicar Nuevo Proyecto
        </h1>
        <p className="text-gray-400 mt-2">
          Esta funcionalidad estará disponible en la próxima versión de EuroNova.
        </p>
      </div>

      <div className="bg-void-surface border border-void-border rounded-2xl p-12 text-center relative overflow-hidden">
        <h2 className="text-xl font-bold text-white mb-2">Próximamente</h2>
        <p className="text-gray-400">Podrás publicar tus propias misiones de voluntariado y juventud aquí.</p>
      </div>
    </div>
  );
}

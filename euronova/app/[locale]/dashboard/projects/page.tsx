import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search, Building, User } from "lucide-react";

export default async function DashboardHome() {
  const t = await getTranslations("DashboardHome");

  return (
    <div className="max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Bienvenido a <span className="text-plasma-cyan">EuroNova</span>
        </h1>
        <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
          Nuestra misión es conectar a jóvenes con oportunidades únicas en el espacio europeo. 
          Elige tu próximo destino.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/projects" className="group relative bg-void-surface border border-void-border rounded-2xl p-8 hover:border-plasma-cyan transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-plasma-cyan/10 transition-colors" />
          <div className="w-16 h-16 bg-plasma-cyan/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Search className="w-8 h-8 text-plasma-cyan" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Buscar Proyectos</h2>
          <p className="text-gray-400 text-sm">
            Explora cientos de oportunidades de movilidad, voluntariado y prácticas en toda Europa.
          </p>
        </Link>

        <Link href="/dashboard/organizations" className="group relative bg-void-surface border border-void-border rounded-2xl p-8 hover:border-hyper-violet transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-hyper-violet/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-hyper-violet/10 transition-colors" />
          <div className="w-16 h-16 bg-hyper-violet/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Building className="w-8 h-8 text-hyper-violet" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Buscar Organizaciones</h2>
          <p className="text-gray-400 text-sm">
            Descubre entidades verificadas, ONGs y empresas asociadas al programa Erasmus+.
          </p>
        </Link>

        <Link href="/dashboard/profile" className="group relative bg-void-surface border border-void-border rounded-2xl p-8 hover:border-nova-flare transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,46,99,0.15)] flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-nova-flare/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-nova-flare/10 transition-colors" />
          <div className="w-16 h-16 bg-nova-flare/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <User className="w-8 h-8 text-nova-flare" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Mi Perfil</h2>
          <p className="text-gray-400 text-sm">
            Completa tus datos, idiomas y región para conectar con las mejores misiones.
          </p>
        </Link>
      </div>
    </div>
  );
}

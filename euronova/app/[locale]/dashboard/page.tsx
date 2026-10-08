import Link from "next/link";
import { Search, Building, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function DashboardHome() {
  const t = await getTranslations("Dashboard");

  return (
    <div className="max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          {t('welcome')} <span className="text-plasma-cyan">EuroNova</span>
        </h1>
        <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
          {t('mission')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/projects" className="group relative bg-void-surface border border-void-border rounded-2xl p-8 hover:border-plasma-cyan transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-plasma-cyan/10 transition-colors" />
          <div className="w-16 h-16 bg-plasma-cyan/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Search className="w-8 h-8 text-plasma-cyan" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('searchProjects')}</h2>
          <p className="text-gray-400 text-sm">
            {t('searchProjectsDesc')}
          </p>
        </Link>

        <Link href="/dashboard/organizations" className="group relative bg-void-surface border border-void-border rounded-2xl p-8 hover:border-hyper-violet transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-hyper-violet/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-hyper-violet/10 transition-colors" />
          <div className="w-16 h-16 bg-hyper-violet/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Building className="w-8 h-8 text-hyper-violet" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('searchOrgs')}</h2>
          <p className="text-gray-400 text-sm">
            {t('searchOrgsDesc')}
          </p>
        </Link>

        <Link href="/dashboard/profile" className="group relative bg-void-surface border border-void-border rounded-2xl p-8 hover:border-nova-flare transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,46,99,0.15)] flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-nova-flare/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-nova-flare/10 transition-colors" />
          <div className="w-16 h-16 bg-nova-flare/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <User className="w-8 h-8 text-nova-flare" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('myProfile')}</h2>
          <p className="text-gray-400 text-sm">
            {t('myProfileDesc')}
          </p>
        </Link>
      </div>
    </div>
  );
}

import { createClient } from '@/utils/supabase/server';
import { 
  Rocket, 
  Globe, 
  Compass, 
  Sparkles, 
  Search, 
  Building, 
  Zap, 
  ShieldCheck,
  PlusCircle,
  Star,
  Building2,
  Users,
  Radio
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { PublicHeader } from '@/components/PublicHeader';
import { Footer } from '@/components/Footer';

export default async function Home() {
  const t = await getTranslations("Landing");
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error connecting to Supabase:', error);
  }

  const projectCount = count || 0;

  return (
    <div className="min-h-screen bg-void-deep text-white flex flex-col relative selection:bg-plasma-cyan/20 selection:text-plasma-cyan">
      {/* 1. Header Público Fijo (Solo Logo y LanguageSwitcher) */}
      <PublicHeader />

      {/* Efectos Cósmicos Ambientales de Fondo */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-hyper-violet/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-plasma-cyan/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-2/3 left-1/3 w-[450px] h-[450px] bg-rup-emerald/10 rounded-full blur-[130px] pointer-events-none" />

      <main className="flex-1 flex flex-col items-center pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 space-y-28 sm:space-y-36">
        
        {/* SECCIÓN 1: HERO */}
        <section className="flex flex-col items-center text-center space-y-6 sm:space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Badge Fase Beta */}
          <div className="bg-void-surface/90 border border-void-border/80 backdrop-blur-md rounded-2xl px-5 py-2 inline-flex items-center space-x-2.5 text-plasma-cyan font-bold text-xs tracking-widest uppercase shadow-[0_0_20px_rgba(0,229,255,0.12)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-plasma-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-plasma-cyan"></span>
            </span>
            <span>{t("betaPhase")}</span>
          </div>

          {/* Logo Principal */}
          <div className="my-2">
            <Image 
              src="/logo-big.png" 
              alt="EuroNova Logo" 
              width={340} 
              height={90} 
              priority 
              className="w-auto h-auto max-w-[280px] sm:max-w-[340px] drop-shadow-[0_0_35px_rgba(0,229,255,0.2)]" 
            />
            <h1 className="sr-only">EuroNova</h1>
          </div>
          
          {/* Título y Subtítulo */}
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
              {t("title")}
            </h2>
            <p className="text-base sm:text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Contador "Proyectos en Órbita" */}
          <div className="bg-void-surface/60 backdrop-blur-xl border border-void-border/80 rounded-2xl p-6 sm:p-8 w-full max-w-md my-4 shadow-[0_0_40px_rgba(0,0,0,0.6)] group hover:border-plasma-cyan/40 transition-colors">
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-plasma-cyan" />
              <span>{t("projectsInOrbit")}</span>
            </p>
            <p className="text-5xl sm:text-6xl font-black text-plasma-cyan flex items-center justify-center gap-3 drop-shadow-[0_0_25px_rgba(0,229,255,0.35)]">
              {projectCount}
            </p>
          </div>

          {/* Botones de Acción Hero */}
          <div className="pt-2 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login" 
              className="group relative inline-flex items-center justify-center px-9 py-4 font-bold text-void-deep bg-plasma-cyan rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:bg-plasma-cyan/90 hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] focus:outline-none w-full sm:w-auto"
            >
              <span className="relative flex items-center gap-2.5 text-base sm:text-lg">
                {t("exploreBtn")} 
                <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </span>
            </Link>

            <Link 
              href="/community" 
              className="group inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-void-surface/80 hover:bg-void-surface border border-void-border hover:border-plasma-cyan/50 rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.5)] focus:outline-none w-full sm:w-auto gap-2.5 text-base"
            >
              <Users className="w-5 h-5 text-plasma-cyan group-hover:scale-110 transition-transform" />
              <span>Community Hub & FAQ</span>
            </Link>
          </div>
        </section>

        {/* SECCIÓN 2: 3 FEATURE CARDS EXISTENTES (CONSERVADAS) */}
        <section className="w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="text-center space-y-3 mb-12 sm:mb-16">
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {t("whyTitle")}
            </h3>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
              {t("whySubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Feature 1 */}
            <div className="bg-void-surface/60 border border-void-border/80 hover:border-plasma-cyan/50 rounded-2xl p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)] group">
              <div className="w-12 h-12 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6 text-plasma-cyan" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mb-2.5">
                {t("feat1Title")}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {t("feat1Desc")}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-void-surface/60 border border-void-border/80 hover:border-hyper-violet/50 rounded-2xl p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] group">
              <div className="w-12 h-12 rounded-xl bg-hyper-violet/10 border border-hyper-violet/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6 text-hyper-violet" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mb-2.5">
                {t("feat2Title")}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {t("feat2Desc")}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-void-surface/60 border border-void-border/80 hover:border-rup-emerald/50 rounded-2xl p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,230,118,0.1)] group">
              <div className="w-12 h-12 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-rup-emerald" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mb-2.5">
                {t("feat3Title")}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {t("feat3Desc")}
              </p>
            </div>

          </div>
        </section>

        {/* SECCIÓN 3: CAPACIDADES DE LA PLATAFORMA (PLATFORM CAPABILITIES - 6 TILES SYMMETRIC GRID) */}
        <section className="w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="text-center space-y-3 mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/25 uppercase tracking-wider mb-1">
              <span>EuroNova Core Engine</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {t("capabilitiesTitle")}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Capability 1: Buscador de Proyectos */}
            <Link
              href="/dashboard/projects"
              className="bg-gradient-to-b from-void-surface/80 to-void-surface/40 border border-void-border/80 hover:border-plasma-cyan/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(0,229,255,0.12)] group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  <Search className="w-6 h-6 text-plasma-cyan" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-plasma-cyan transition-colors">
                  {t("capProjectsTitle")}
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {t("capProjectsText")}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-plasma-cyan group-hover:translate-x-1 transition-transform">
                <span>Search Missions &rarr;</span>
              </div>
            </Link>

            {/* Capability 2: Directorio de Organizaciones */}
            <Link
              href="/dashboard/organizations"
              className="bg-gradient-to-b from-void-surface/80 to-void-surface/40 border border-void-border/80 hover:border-hyper-violet/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(99,102,241,0.12)] group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <Building className="w-6 h-6 text-hyper-violet" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-hyper-violet transition-colors">
                  {t("capOrgsTitle")}
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {t("capOrgsText")}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-hyper-violet group-hover:translate-x-1 transition-transform">
                <span>View Directory &rarr;</span>
              </div>
            </Link>

            {/* Capability 3: Radar Interactivo de Misiones */}
            <Link
              href="/map"
              className="bg-gradient-to-b from-void-surface/80 to-void-surface/40 border border-void-border/80 hover:border-plasma-cyan/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(0,229,255,0.12)] group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  <Radio className="w-6 h-6 text-plasma-cyan" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-plasma-cyan transition-colors">
                  {t("capRadarTitle")}
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {t("capRadarText")}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-plasma-cyan group-hover:translate-x-1 transition-transform">
                <span>Open Radar Map &rarr;</span>
              </div>
            </Link>

            {/* Capability 4: Regiones Ultraperiféricas (RUP) */}
            <Link
              href="/dashboard/projects?rup=true"
              className="bg-gradient-to-b from-void-surface/80 to-void-surface/40 border border-void-border/80 hover:border-rup-emerald/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(0,230,118,0.12)] group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-rup-emerald/15 border border-rup-emerald/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,230,118,0.2)]">
                  <Sparkles className="w-6 h-6 text-rup-emerald" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-rup-emerald transition-colors">
                  {t("capRupTitle")}
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {t("capRupText")}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-rup-emerald group-hover:translate-x-1 transition-transform">
                <span>View RUP Missions &rarr;</span>
              </div>
            </Link>

            {/* Capability 5: Rápido, Gratuito y Personalizado */}
            <div className="bg-gradient-to-b from-void-surface/80 to-void-surface/40 border border-void-border/80 hover:border-rup-emerald/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(0,230,118,0.12)] group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-rup-emerald/15 border border-rup-emerald/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,230,118,0.2)]">
                  <Zap className="w-6 h-6 text-rup-emerald" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3">
                  {t("capFastFreeTitle")}
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {t("capFastFreeText")}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <span>Verified Quality</span>
              </div>
            </div>

            {/* Capability 6: Global Community Hub & FAQ */}
            <Link
              href="/community"
              className="bg-gradient-to-b from-void-surface/80 to-void-surface/40 border border-void-border/80 hover:border-plasma-cyan/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(0,229,255,0.15)] group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  <Users className="w-6 h-6 text-plasma-cyan" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-plasma-cyan transition-colors flex items-center justify-between">
                  <span>{t("capCommunityTitle")}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-wider">
                    New
                  </span>
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {t("capCommunityText")}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-plasma-cyan group-hover:translate-x-1 transition-transform">
                <span>Enter Community Hub &rarr;</span>
              </div>
            </Link>

          </div>
        </section>

        {/* SECCIÓN 4: PARA ORGANIZACIONES Y ONG (FOR ORGANIZATIONS & NGOS) */}
        <section className="w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="text-center space-y-3 mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10px] font-bold bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/30 uppercase tracking-wider mb-1">
              <span>NGO & Entity Ecosystem</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {t("forOrgsTitle")}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Org Benefit 1: Publica y Promociona */}
            <div className="bg-gradient-to-b from-void-surface/90 to-void-surface/50 border border-void-border/90 hover:border-hyper-violet/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(99,102,241,0.15)] group">
              <div className="w-12 h-12 rounded-xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <PlusCircle className="w-6 h-6 text-hyper-violet" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mb-3">
                {t("orgPublishTitle")}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {t("orgPublishText")}
              </p>
            </div>

            {/* Org Benefit 2: Construye Reputación y Reseñas */}
            <div className="bg-gradient-to-b from-void-surface/90 to-void-surface/50 border border-void-border/90 hover:border-hyper-violet/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(99,102,241,0.15)] group">
              <div className="w-12 h-12 rounded-xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Star className="w-6 h-6 text-hyper-violet" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mb-3">
                {t("orgReviewsTitle")}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {t("orgReviewsText")}
              </p>
            </div>

            {/* Org Benefit 3: Perfil de Organización Personalizado */}
            <div className="bg-gradient-to-b from-void-surface/90 to-void-surface/50 border border-void-border/90 hover:border-hyper-violet/50 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(99,102,241,0.15)] group">
              <div className="w-12 h-12 rounded-xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Building2 className="w-6 h-6 text-hyper-violet" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mb-3">
                {t("orgProfileTitle")}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {t("orgProfileText")}
              </p>
            </div>

          </div>
        </section>

        {/* SECCIÓN 5: SOBRE EURONOVA (CORPORATE LORE & INICIATIVA) */}
        <section className="w-full max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-void-surface/90 via-void-surface/70 to-void-deep/90 border border-void-border/90 rounded-3xl p-8 sm:p-12 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-plasma-cyan/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                <ShieldCheck className="w-8 h-8 text-plasma-cyan" />
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/25 uppercase tracking-wider">
                  <span>{t("missionBadge")}</span>
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {t("aboutTitle")}
                </h4>
                <div className="space-y-3 text-sm sm:text-base text-gray-300 leading-relaxed font-light">
                  <p>{t("aboutText1")}</p>
                  <p>{t("aboutText2")}</p>
                </div>

                <div className="pt-2">
                  <Link 
                    href="/login" 
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-plasma-cyan hover:text-white transition-colors"
                  >
                    <span>{t("exploreBtn")} &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer Minimalista */}
      <Footer />
    </div>
  );
}

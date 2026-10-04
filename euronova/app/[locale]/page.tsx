import { supabase } from '@/lib/supabase';
import { Rocket } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function Home() {
  // Consulta asíncrona a Supabase para contar los proyectos
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error al conectar con Supabase:', error);
  }

  const projectCount = count || 0;

  return (
    <main className="min-h-screen bg-void-deep text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Efectos de fondo cósmicos */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-hyper-violet/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-plasma-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 flex flex-col items-center text-center space-y-8 max-w-3xl">
        <div className="bg-void-surface border border-void-border rounded-2xl px-6 py-2 inline-flex items-center space-x-2 text-plasma-cyan font-medium text-sm tracking-widest uppercase mb-4 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-plasma-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-plasma-cyan"></span>
          </span>
          <span>FASE BETA</span>
        </div>

        <div className="mb-4">
          <Image src="/logo-big.png" alt="EuroNova Logo" width={300} height={80} priority />
          <h1 className="sr-only">EuroNova</h1>
        </div>
        
        <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl leading-relaxed">
          Tu pasaporte al <span className="text-white font-medium">espacio europeo</span>. Descubre proyectos de movilidad, voluntariado y oportunidades únicas.
        </p>

        <div className="bg-void-surface/50 backdrop-blur-md border border-void-border rounded-xl p-6 w-full max-w-md my-8">
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-2 font-semibold">Proyectos en Órbita</p>
          <p className="text-6xl font-black text-plasma-cyan flex items-center justify-center gap-3">
            {projectCount}
          </p>
        </div>

        <Link href="/login" className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-void-deep bg-plasma-cyan rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:bg-plasma-cyan/80 hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] focus:outline-none">
          <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
          <span className="relative flex items-center gap-2">
            Explorar Misiones <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </span>
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { LogOut, User, Building, PlusCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/app/[locale]/login/actions";

export function Header({ role }: { role: "youth" | "org" }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-void-deep/80 backdrop-blur-md border-b border-void-border z-50 flex items-center justify-between px-4 lg:px-8">
      <Link href="/dashboard" className="flex items-center gap-2 group">
        <Image src="/logo-small.png" alt="EuroNova" width={32} height={32} className="group-hover:scale-110 transition-transform" />
        <span className="font-black text-white text-xl hidden sm:block">EuroNova</span>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Inicio</Link>
        <Link href="/dashboard/projects" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Buscar Proyectos</Link>
        <Link href="/dashboard/organizations" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Buscar Organizaciones</Link>
      </nav>

      <div className="flex items-center gap-3">
        {role === "org" && (
          <Link href="/dashboard/projects/new" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-plasma-cyan/10 hover:bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/20 transition-all text-sm font-semibold">
            <PlusCircle className="w-4 h-4" />
            <span>Publicar</span>
          </Link>
        )}
        
        <LanguageSwitcher />
        
        <Link href="/dashboard/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-surface hover:bg-hyper-violet/10 border border-void-border hover:border-hyper-violet/30 text-gray-300 hover:text-hyper-violet transition-all text-sm font-semibold">
          {role === "org" ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
          <span className="hidden sm:block">{role === "org" ? "Mi Organización" : "Mi Perfil"}</span>
        </Link>
        
        <form action={logout}>
          <button type="submit" className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all group" title="Cerrar Sesión">
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </form>
      </div>
    </header>
  );
}

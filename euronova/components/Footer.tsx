import { Mail } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-void-deep border-t border-void-border py-8 mt-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} EuroNova. Todos los derechos reservados.
        </div>
        <Link
          href="/dashboard/support"
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-plasma-cyan transition-colors"
        >
          <Mail className="w-4 h-4" />
          Soporte / Crear Ticket
        </Link>
      </div>
    </footer>
  );
}

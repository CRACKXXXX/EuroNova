import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { 
  ShieldCheck, 
  Scale, 
  FileText, 
  LifeBuoy,
  Heart
} from "lucide-react";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-20 w-full bg-void-deep/95 border-t border-void-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Identidad de Marca y Misión */}
          <div className="md:col-span-6 space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <Image
                src="/logo-big.png"
                alt="EuroNova"
                width={130}
                height={35}
                className="h-8 w-auto object-contain rounded-md"
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-md mx-auto sm:mx-0">
              Gateway to European youth mobility, non-formal learning opportunities, and international solidarity across the EU.
            </p>
          </div>

          {/* Enlaces Legales */}
          <div className="md:col-span-3 space-y-2.5 text-center sm:text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Legal
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link
                  href="/legal/privacy"
                  className="flex items-center justify-center sm:justify-start gap-2 transition-colors hover:text-plasma-cyan group"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-plasma-cyan/70 group-hover:text-plasma-cyan transition-colors" />
                  <span>{t("privacy")}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="flex items-center justify-center sm:justify-start gap-2 transition-colors hover:text-plasma-cyan group"
                >
                  <Scale className="w-3.5 h-3.5 text-hyper-violet/70 group-hover:text-hyper-violet transition-colors" />
                  <span>{t("terms")}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/notice"
                  className="flex items-center justify-center sm:justify-start gap-2 transition-colors hover:text-plasma-cyan group"
                >
                  <FileText className="w-3.5 h-3.5 text-rup-emerald/70 group-hover:text-rup-emerald transition-colors" />
                  <span>{t("notice")}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Asistencia / Soporte */}
          <div className="md:col-span-3 space-y-2.5 text-center sm:text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Support
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link
                  href="/dashboard/support"
                  className="flex items-center justify-center sm:justify-start gap-2 transition-colors hover:text-plasma-cyan group"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-hyper-violet/70 group-hover:text-hyper-violet transition-colors" />
                  <span>{t("support")}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="flex items-center justify-center sm:justify-start gap-2 transition-colors hover:text-nova-flare group font-medium text-nova-flare/90"
                >
                  <Heart className="w-3.5 h-3.5 text-nova-flare/70 group-hover:text-nova-flare transition-colors" />
                  <span>Support EuroNova</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Línea Inferior: Copyright */}
        <div className="pt-8 mt-8 border-t border-void-border/60 text-center sm:text-left text-xs text-gray-500">
          <p className="font-medium text-gray-400">
            &copy; {new Date().getFullYear()} EuroNova Project. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

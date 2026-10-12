import { Mail } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="bg-void-deep border-t border-void-border mt-12 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} EuroNova. {t("rights")}
        </div>
        <Link
          href="/dashboard/support"
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-plasma-cyan transition-colors"
        >
          <Mail className="w-4 h-4 text-plasma-cyan" />
          <span>{t("support")}</span>
        </Link>
      </div>
    </footer>
  );
}

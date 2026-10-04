import { ArrowLeft, HeadphonesIcon } from "lucide-react";
import Link from "next/link";
import { SupportForm } from "./SupportForm";
import { getTranslations } from "next-intl/server";

export default async function SupportPage() {
  const t = await getTranslations("SupportForm");

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
          <HeadphonesIcon className="w-8 h-8 text-plasma-cyan" /> 
          {t("title")}
        </h1>
        <p className="text-gray-400 mt-2">
          {t("description")}
        </p>
      </div>

      <div className="bg-void-surface border border-void-border rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-plasma-cyan/5 rounded-full blur-[80px] pointer-events-none" />
        <SupportForm />
      </div>
    </div>
  );
}

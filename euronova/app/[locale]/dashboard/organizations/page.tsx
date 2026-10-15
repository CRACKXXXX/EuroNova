import { createClient } from "@/utils/supabase/server";
import { Building, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { OrganizationsClient } from "./OrganizationsClient";
import { OrganizationCard } from "@/components/OrganizationCard";
import { Suspense } from "react";


export const dynamic = 'force-dynamic';

export default async function OrganizationsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const t = await getTranslations("Organizations");

  const q = searchParams.q as string | undefined;
  const countriesParam = searchParams.countries as string | undefined;
  const verified = searchParams.verified === "true";
  const entityType = searchParams.entityType as string | undefined;

  let query = supabase.from("users_org").select("*");

  if (q) {
    query = query.ilike("org_name", `%${q}%`);
  }
  if (countriesParam) {
    const countriesArr = countriesParam.split(",");
    query = query.in("country_hq", countriesArr);
  }
  if (verified) {
    query = query.eq("verification_status", "verified");
  }
  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data: organizations, error } = await query;

  if (error) {
    console.error("Error al obtener organizaciones:", error);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-2">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t('backHome')}</span>
        </Link>
      </div>
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Building className="w-8 h-8 text-hyper-violet" /> 
          {t('directory')}
        </h1>
        <p className="text-gray-400 mt-2">
          {t('findNgos')}
        </p>
      </div>

      {/* Componente cliente para los filtros */}
      <Suspense fallback={<div className="h-16 rounded-xl bg-void-surface animate-pulse" />}>
        <OrganizationsClient 
          initialQ={q || ""} 
          initialCountries={countriesParam ? countriesParam.split(",") : []} 
          initialVerified={verified} 
          initialEntityType={entityType || ""}
        />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {organizations && organizations.length > 0 ? (
          organizations.map((org) => (
            <OrganizationCard key={org.id as string} org={org} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/50">
            <Building className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('noOrgsFound')}</h3>
            <p className="text-gray-400">{t('adjustFilters')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

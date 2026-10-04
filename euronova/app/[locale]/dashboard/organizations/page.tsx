import { createClient } from "@/utils/supabase/server";
import { Building, Globe, Mail, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { OrganizationsClient } from "./OrganizationsClient";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  const q = searchParams.q as string | undefined;
  const countriesParam = searchParams.countries as string | undefined;
  const verified = searchParams.verified === "true";
  const theme = searchParams.theme as string | undefined;
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
    query = query.eq("verified", true);
  }
  if (theme) {
    query = query.contains("themes", [theme]);
  }
  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data: organizations, error } = await query;

  if (error) {
    console.error("Error al obtener organizaciones:", error);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-2">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Volver al Home</span>
        </Link>
      </div>
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Building className="w-8 h-8 text-hyper-violet" /> 
          Directorio de Organizaciones
        </h1>
        <p className="text-gray-400 mt-2">
          Encuentra ONGs, empresas y entidades asociadas al programa Erasmus+ por toda Europa.
        </p>
      </div>

      {/* Componente cliente para los filtros */}
      <Suspense fallback={<div className="h-16 rounded-xl bg-void-surface animate-pulse" />}>
        <OrganizationsClient 
          initialQ={q || ""} 
          initialCountries={countriesParam ? countriesParam.split(",") : []} 
          initialVerified={verified} 
          initialTheme={theme || ""} 
          initialEntityType={entityType || ""}
        />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {organizations && organizations.length > 0 ? (
          organizations.map((org: Record<string, unknown>) => (
            <div key={org.id as string} className="bg-void-surface border border-void-border rounded-2xl p-6 hover:border-hyper-violet/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white group-hover:text-hyper-violet transition-colors">{(org.org_name as string) || "Organización Sin Nombre"}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-400">{(org.country_hq as string) || "País no especificado"}</span>
                  </div>
                </div>
                {org.verified ? (
                  <div className="px-2 py-1 rounded-md bg-rup-emerald/10 border border-rup-emerald/30">
                    <span className="text-[10px] font-bold text-rup-emerald uppercase tracking-wider">Verificada</span>
                  </div>
                ) : null}
              </div>
              
              <p className="text-sm text-gray-300 mb-6 flex-1 line-clamp-3">
                {(org.description as string) || "Esta organización aún no ha añadido una descripción de su misión y valores."}
              </p>

              <div className="pt-4 border-t border-void-border flex items-center gap-4">
                {org.website && (
                  <a href={(org.website as string).startsWith('http') ? (org.website as string) : `https://${org.website as string}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-400 hover:text-plasma-cyan transition-colors">
                    <Globe className="w-4 h-4" />
                    Web
                  </a>
                )}
                {org.contact_email && (
                  <a href={`mailto:${org.contact_email as string}`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-plasma-cyan transition-colors ml-auto">
                    <Mail className="w-4 h-4" />
                    Contactar
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/50">
            <Building className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No se encontraron organizaciones</h3>
            <p className="text-gray-400">Prueba a ajustar los filtros para ver más resultados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

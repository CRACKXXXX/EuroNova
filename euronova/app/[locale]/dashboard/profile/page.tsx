import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { redirect } from "next/navigation";
import { User, Building, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfilePage() {
  const t = await getTranslations("Profile");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Determinar el rol (Priorizar metadata, sino fallback a tabla)
  let role: "youth" | "org" = user.user_metadata?.role || "youth";
  let profileData = null;

  // 2. Extraer datos o forzar su creación
  if (role === "youth") {
    const { data: youthData, error: youthError } = await supabase
      .from("users_youth")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (youthData) {
      profileData = youthData;
    } else {
      // Sincronización instantánea (Autocreate)
      const { data: newYouth } = await supabase
        .from("users_youth")
        .upsert({ id: user.id })
        .select()
        .single();
      profileData = newYouth;
    }
  } else {
    const { data: orgData, error: orgError } = await supabase
      .from("users_org")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (orgData) {
      profileData = orgData;
    } else {
      // Sincronización instantánea (Autocreate)
      const { data: newOrg } = await supabase
        .from("users_org")
        .upsert({ id: user.id })
        .select()
        .single();
      profileData = newOrg;
    }
  }

  console.log('DATOS DB:', profileData);

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Volver al Home</span>
        </Link>
      </div>
      
      <div className="bg-void-surface border border-void-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow de fondo según rol */}
        {role === "youth" ? (
          <div className="absolute top-0 right-0 w-64 h-64 bg-plasma-cyan/5 rounded-full blur-[80px] pointer-events-none" />
        ) : (
          <div className="absolute top-0 right-0 w-64 h-64 bg-hyper-violet/5 rounded-full blur-[80px] pointer-events-none" />
        )}

        <div className="flex items-center gap-4 mb-8 border-b border-void-border pb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            role === "youth" ? "bg-plasma-cyan/20 text-plasma-cyan" : "bg-hyper-violet/20 text-hyper-violet"
          }`}>
            {role === "youth" ? <User className="w-7 h-7" /> : <Building className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t('title')}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {role === "youth" 
                ? t('youthDesc') 
                : t('orgDesc')}
            </p>
          </div>
        </div>

        <ProfileForm 
          key={profileData ? JSON.stringify(profileData) : "empty"} 
          initialData={profileData} 
          role={role} 
        />
      </div>
    </div>
  );
}

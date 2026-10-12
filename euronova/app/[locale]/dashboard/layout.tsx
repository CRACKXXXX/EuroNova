import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Resolver rol real consultando la base de datos de organizaciones
  let role: "youth" | "org" = "youth";
  
  const { data: orgData } = await supabase
    .from("users_org")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (orgData) {
    role = "org";
  } else {
    role = "youth";
  }

  return (
    <div className="min-h-screen bg-void-deep text-white flex flex-col">
      <Header role={role} isAdmin={user.email === 'euronovaofficial@gmail.com'} />

      {/* pt-16 para compensar el Header fijo */}
      <div className="flex-1 pt-16 flex flex-col min-h-screen">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}

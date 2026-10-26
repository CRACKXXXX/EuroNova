import { Metadata } from "next";
import { Header } from "@/components/Header";
import { ProjectsMap } from "@/components/map/ProjectsMap";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "EuroNova",
  description: "Interactive real-time map of all European mobility, Erasmus+, and volunteering missions.",
};

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  // Check user session safely to render accurate Header state
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "youth" | "org" = "youth";
  let isAdmin = false;

  if (user) {
    isAdmin = user.email === "euronovaofficial@gmail.com";
    const { data: orgData } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (orgData) {
      role = "org";
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-void-deep text-white overflow-hidden">
      {/* Universal EuroNova Cosmic Header */}
      <Header role={role} isAdmin={isAdmin} />

      {/* Fullscreen Map Workspace (pt-16 compensates for fixed Header) */}
      <main className="flex-1 w-full h-[calc(100dvh-4rem)] pt-16 flex flex-col relative overflow-hidden">
        <ProjectsMap />
      </main>
    </div>
  );
}

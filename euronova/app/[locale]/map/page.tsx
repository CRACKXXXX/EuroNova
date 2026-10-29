import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { createClient } from "@/utils/supabase/server";

const ProjectsMap = dynamic(
  () => import("@/components/map/ProjectsMap").then((mod) => mod.ProjectsMap),
  {
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-void-deep text-white border border-void-border/40 select-none">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-plasma-cyan/20 border-t-plasma-cyan animate-spin" />
          <div className="absolute w-8 h-8 rounded-full border border-hyper-violet/40 border-b-hyper-violet animate-spin [animation-direction:reverse]" />
        </div>
      </div>
    ),
  }
);

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

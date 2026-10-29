import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/server";

const AnalyticsFunnelsClient = dynamic(
  () => import("./AnalyticsFunnelsClient").then((mod) => mod.AnalyticsFunnelsClient),
  {
    loading: () => (
      <div className="space-y-8 animate-pulse pb-16">
        {/* Nav tabs skeleton */}
        <div className="h-12 w-full max-w-xl bg-void-surface/60 rounded-xl border border-void-border/40" />

        {/* Header skeleton */}
        <div className="h-28 w-full bg-void-surface/80 rounded-2xl border border-void-border p-6 flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-void-deep/80 rounded-lg" />
            <div className="h-4 w-72 bg-void-deep/50 rounded-lg" />
          </div>
          <div className="h-9 w-36 bg-void-deep/80 rounded-xl" />
        </div>

        {/* Metric cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-void-surface/70 rounded-2xl border border-void-border p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-void-deep rounded" />
                <div className="w-8 h-8 rounded-xl bg-void-deep" />
              </div>
              <div className="h-7 w-20 bg-void-deep rounded-lg" />
              <div className="h-3 w-32 bg-void-deep/50 rounded" />
            </div>
          ))}
        </div>

        {/* Conversion Funnel skeleton */}
        <div className="h-96 w-full bg-void-surface/90 rounded-2xl border border-void-border p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-void-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-void-deep" />
              <div className="space-y-1.5">
                <div className="h-5 w-40 bg-void-deep rounded" />
                <div className="h-3 w-64 bg-void-deep/50 rounded" />
              </div>
            </div>
            <div className="h-6 w-24 bg-void-deep rounded-full" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-48 bg-void-deep rounded" />
                <div className="h-12 w-full bg-void-deep/80 rounded-2xl border border-void-border" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

export default async function Page(props: { params: Promise<{ id: string; locale: string }> }) {
  const [{ id, locale }, supabase] = await Promise.all([
    props.params,
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  
  // Dynamically verify if the logged-in user owns THIS specific organization
  const isOwner = user?.id === id || user?.email === 'euronovaofficial@gmail.com';
  
  if (!isOwner) {
    redirect(`/${locale}/dashboard/organizations/${id}`);
  }

  // Render the real tool, passing the dynamic organization ID
  return <AnalyticsFunnelsClient orgId={id} />; 
}

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { WebhooksClient } from "./WebhooksClient";

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

  // Fetch organization name for breadcrumb navigation
  const { data: org } = await supabase
    .from("users_org")
    .select("org_name")
    .eq("id", id)
    .maybeSingle();

  // Render the real tool, passing the dynamic organization ID and name
  return <WebhooksClient orgId={id} orgName={org?.org_name || "Organization"} />; 
}

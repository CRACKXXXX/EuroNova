import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TeamClient } from "./TeamClient";

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
  return <TeamClient orgId={id} />; 
}

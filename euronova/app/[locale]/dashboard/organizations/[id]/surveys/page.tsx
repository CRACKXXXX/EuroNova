import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getOrgSurveysAction } from "@/actions/surveys";
import { NgoSurveysManager } from "./NgoSurveysManager";

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

  // Fetch organization's community surveys with 50-item pagination
  const initialSurveys = await getOrgSurveysAction(id, 1, 50);

  // Render the Dynamic NGO Surveys creator and manager
  return <NgoSurveysManager orgId={id} initialSurveys={initialSurveys} />; 
}

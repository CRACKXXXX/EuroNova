import { redirect } from "next/navigation";

export default async function ProjectRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(`/${locale}/dashboard/projects/${id}`);
}

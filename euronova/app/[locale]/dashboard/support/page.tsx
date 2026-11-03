import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getUserTickets } from "./actions";
import { UserSupportHubClient } from "./UserSupportHubClient";

export const dynamic = "force-dynamic";

export default async function SupportPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, supabase] = await Promise.all([
    props.params,
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [t, { tickets }] = await Promise.all([
    getTranslations("SupportHub"),
    getUserTickets(),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-2">
        <Breadcrumbs items={[{ label: t("title") }]} />
      </div>

      <UserSupportHubClient
        initialTickets={tickets}
        userEmail={user.email || ""}
      />
    </div>
  );
}

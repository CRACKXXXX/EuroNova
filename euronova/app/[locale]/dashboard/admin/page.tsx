import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert, CheckCircle2, Globe, Mail, Camera, Video, Briefcase, Smartphone, XCircle, Trash2 } from "lucide-react";
import { verifyOrganization, revokeOrganization, deleteOrganization } from "./actions";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== "euronovaofficial@gmail.com") {
    redirect("/dashboard");
  }

  // Fetch pending organizations
  const { data: pendingOrgs } = await supabase
    .from("users_org")
    .select("*")
    .or("verification_status.eq.pending,verification_status.is.null");

  // Fetch verified organizations
  const { data: verifiedOrgs } = await supabase
    .from("users_org")
    .select("*")
    .eq("verification_status", "verified");

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-void-border pb-6">
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
          <ShieldAlert className="w-10 h-10 text-nova-flare" />
          God Mode: Command Center
        </h1>
        <p className="text-gray-400 mt-2">Administrative panel to manage and verify entities.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          Pending Organizations <span className="bg-nova-flare/20 text-nova-flare text-sm py-1 px-3 rounded-full">{pendingOrgs?.length || 0}</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingOrgs?.map((org) => (
            <div key={org.id} className="bg-void-surface border border-nova-flare/30 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">{org.org_name || "Unnamed"}</h3>
              <p className="text-sm text-gray-400 mb-6 flex-1 line-clamp-3">{org.description || "No description provided."}</p>
              
              <div className="flex flex-col gap-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-plasma-cyan" />
                  <a href={`mailto:${org.contact_email}`} className="hover:text-plasma-cyan transition-colors">{org.contact_email}</a>
                </div>
                {org.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">
                      {org.website}
                    </a>
                  </div>
                )}
                {org.social_instagram && (
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_instagram.startsWith('http') ? org.social_instagram : `https://${org.social_instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">Instagram</a>
                  </div>
                )}
                {org.social_tiktok && (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_tiktok.startsWith('http') ? org.social_tiktok : `https://${org.social_tiktok}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">TikTok</a>
                  </div>
                )}
                {org.social_youtube && (
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_youtube.startsWith('http') ? org.social_youtube : `https://${org.social_youtube}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">YouTube</a>
                  </div>
                )}
                {org.social_linkedin && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_linkedin.startsWith('http') ? org.social_linkedin : `https://${org.social_linkedin}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">LinkedIn</a>
                  </div>
                )}
              </div>

              <form action={async () => {
                "use server";
                await verifyOrganization(org.id);
              }}>
                <button type="submit" className="w-full py-3 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold transition-all duration-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Approve Entity
                </button>
              </form>
            </div>
          ))}
          {(!pendingOrgs || pendingOrgs.length === 0) && (
            <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl">
              <p className="text-gray-400">No pending organizations.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          Verified Entities <span className="bg-rup-emerald/20 text-rup-emerald text-sm py-1 px-3 rounded-full">{verifiedOrgs?.length || 0}</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {verifiedOrgs?.map((org) => (
            <div key={org.id} className="bg-void-surface border border-rup-emerald/30 rounded-2xl p-6 flex flex-col opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-white">{org.org_name || "Unnamed"}</h3>
                <CheckCircle2 className="w-5 h-5 text-rup-emerald shrink-0" />
              </div>
              <p className="text-sm text-gray-400 mb-6 flex-1 line-clamp-3">{org.description || "No description provided."}</p>
              
              <div className="flex flex-col gap-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-plasma-cyan" />
                  <a href={`mailto:${org.contact_email}`} className="hover:text-plasma-cyan transition-colors">{org.contact_email}</a>
                </div>
                {org.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">
                      {org.website}
                    </a>
                  </div>
                )}
                {org.social_instagram && (
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_instagram.startsWith('http') ? org.social_instagram : `https://${org.social_instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">Instagram</a>
                  </div>
                )}
                {org.social_tiktok && (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_tiktok.startsWith('http') ? org.social_tiktok : `https://${org.social_tiktok}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">TikTok</a>
                  </div>
                )}
                {org.social_youtube && (
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_youtube.startsWith('http') ? org.social_youtube : `https://${org.social_youtube}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">YouTube</a>
                  </div>
                )}
                {org.social_linkedin && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-plasma-cyan" />
                    <a href={org.social_linkedin.startsWith('http') ? org.social_linkedin : `https://${org.social_linkedin}`} target="_blank" rel="noopener noreferrer" className="hover:text-plasma-cyan transition-colors truncate">LinkedIn</a>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6 mt-auto pt-4 border-t border-void-border">
                <form action={async () => {
                  "use server";
                  await revokeOrganization(org.id);
                }} className="flex-1">
                  <button type="submit" className="w-full py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 font-bold transition-all text-sm flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Revoke
                  </button>
                </form>
                <form action={async () => {
                  "use server";
                  await deleteOrganization(org.id);
                }} className="flex-1">
                  <button type="submit" className="w-full py-2 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold transition-all text-sm flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {(!verifiedOrgs || verifiedOrgs.length === 0) && (
            <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl">
              <p className="text-gray-400">No verified entities yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

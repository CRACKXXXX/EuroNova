"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Crown, 
  Search, 
  CheckCircle2, 
  Mail, 
  Calendar, 
  Trash2, 
  UserCog, 
  X, 
  Building,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { OrganizationNavTabs } from "@/components/OrganizationNavTabs";
import { createClient } from "@/utils/supabase/client";

export type MemberRole = "Owner" | "Coordinator" | "Reviewer";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "active" | "pending";
  joinedAt: string;
  avatarUrl?: string;
  isOwnerAccount?: boolean;
}

interface TeamClientProps {
  orgId: string;
  orgName?: string;
}

export function TeamClient({ orgId, orgName = "Organization" }: TeamClientProps) {
  const t = useTranslations("OrgTeam");
  const format = useFormatter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Formulario de invitación
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("Coordinator");
  const [inviteName, setInviteName] = useState("");
  
  // Estado para confirmación inline de eliminación (Sin browser confirm)
  const [memberToRevoke, setMemberToRevoke] = useState<TeamMember | null>(null);

  // Transición para mutaciones asíncronas
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let ignore = false;

    async function loadTeam() {
      try {
        const supabase = createClient();

        // 1. Obtener la organización para configurar al Propietario principal
        const { data: orgData } = await supabase
          .from("users_org")
          .select("id, org_name, contact_email, created_at, avatar_url")
          .eq("id", orgId)
          .maybeSingle();

        const ownerMember: TeamMember = {
          id: orgData?.id || orgId,
          name: orgData?.org_name || orgName || "Primary Organization Owner",
          email: orgData?.contact_email || "official@organization.eu",
          role: "Owner",
          status: "active",
          joinedAt: orgData?.created_at 
            ? format.dateTime(new Date(orgData.created_at), { year: "numeric", month: "short", day: "numeric" })
            : "Founder",
          avatarUrl: orgData?.avatar_url || undefined,
          isOwnerAccount: true,
        };

        // 2. Obtener miembros invitados reales desde org_team_members
        const { data: teamData, error: teamError } = await supabase
          .from("org_team_members")
          .select("id, name, email, role, status, created_at")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false });

        if (teamError) {
          console.error("Could not fetch team members from org_team_members:", teamError.message);
        }

        const invitedMembers: TeamMember[] = (teamData || []).map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role as MemberRole,
          status: m.status as "active" | "pending",
          joinedAt: format.dateTime(new Date(m.created_at), { year: "numeric", month: "short", day: "numeric" }),
          isOwnerAccount: false,
        }));

        if (!ignore) {
          setMembers([ownerMember, ...invitedMembers]);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Error loading team members:", err);
          toast.error(t("loadTeamError"));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadTeam();

    return () => {
      ignore = true;
    };
  }, [orgId, orgName, format, t]);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const formattedEmail = inviteEmail.trim().toLowerCase();

    if (!formattedEmail || !emailRegex.test(formattedEmail)) {
      toast.error(t("validEmailError"));
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const formattedName = inviteName.trim() || formattedEmail.split("@")[0].replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase());

        const { data, error } = await supabase
          .from("org_team_members")
          .insert({
            org_id: orgId,
            name: formattedName,
            email: formattedEmail,
            role: inviteRole,
            status: "pending",
          })
          .select("id, name, email, role, status, created_at")
          .single();

        if (error) {
          if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("already exists")) {
            toast.error(t("memberExistsError", { email: formattedEmail }));
          } else {
            toast.error(error.message || "Failed to dispatch invitation.");
          }
          return;
        }

        if (data) {
          const newMember: TeamMember = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role as MemberRole,
            status: data.status as "active" | "pending",
            joinedAt: "Just now",
            isOwnerAccount: false,
          };

          setMembers((prev) => [prev[0], newMember, ...prev.slice(1)]);
          setIsInviteModalOpen(false);
          setInviteEmail("");
          setInviteName("");
          setInviteRole("Coordinator");
          toast.success(t("inviteDispatchedSuccess", { email: formattedEmail }));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error dispatching invitation";
        toast.error(msg);
      }
    });
  };

  const handleConfirmRevoke = async () => {
    if (!memberToRevoke) return;
    const memberName = memberToRevoke.name;
    const memberId = memberToRevoke.id;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("org_team_members")
          .delete()
          .eq("id", memberId);

        if (error) {
          toast.error(t("revokeAccessError", { error: error.message }));
        } else {
          setMembers((prev) => prev.filter((m) => m.id !== memberId));
          toast.success(t("accessRevokedSuccess", { name: memberName }));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error deleting member";
        toast.error(msg);
      } finally {
        setMemberToRevoke(null);
      }
    });
  };

  const getRoleBadge = (role: MemberRole) => {
    switch (role) {
      case "Owner":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-hyper-violet/20 border border-hyper-violet/40 text-hyper-violet shadow-[0_0_10px_rgba(99,102,241,0.2)]">
            <Crown className="w-3 h-3 text-hyper-violet" />
            <span>{t("roleOwner")}</span>
          </span>
        );
      case "Coordinator":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-plasma-cyan/20 border border-plasma-cyan/40 text-plasma-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]">
            <ShieldCheck className="w-3 h-3 text-plasma-cyan" />
            <span>{t("roleCoordinator")}</span>
          </span>
        );
      case "Reviewer":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rup-emerald/20 border border-rup-emerald/40 text-rup-emerald shadow-[0_0_10px_rgba(0,230,118,0.2)]">
            <CheckCircle2 className="w-3 h-3 text-rup-emerald" />
            <span>{t("roleReviewer")}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <OrganizationNavTabs orgId={orgId} isOwner={true} />

      {/* Control bar: Search & Invite Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-void-surface/80 border border-void-border p-4 rounded-2xl backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm text-white placeholder-gray-500 outline-none transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:brightness-110 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t("inviteBtn")}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-void-surface/50 border border-void-border animate-pulse" />
          ))}
        </div>
      ) : (
        /* Team Members List */
        <div className="bg-void-surface/80 border border-void-border rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="p-4 sm:p-6 border-b border-void-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-hyper-violet/15 border border-hyper-violet/40 flex items-center justify-center text-hyper-violet">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t("rosterTitle")}
                </h3>
                <p className="text-xs text-gray-400">
                  {members.length} {members.length === 1 ? "member" : "members"} registered in database
                </p>
              </div>
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">{t("noMembers")}</h4>
              <p className="text-xs text-gray-400">{t("noMembersHint")}</p>
            </div>
          ) : (
            <div className="divide-y divide-void-border">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-void-deep/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      member.isOwnerAccount
                        ? "bg-hyper-violet/15 border-hyper-violet/40 text-hyper-violet"
                        : "bg-void-deep border-void-border text-gray-400"
                    }`}>
                      {member.isOwnerAccount ? <Building className="w-5 h-5" /> : <UserCog className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm sm:text-base truncate">
                          {member.name}
                        </span>
                        {getRoleBadge(member.role)}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          member.status === "active"
                            ? "bg-rup-emerald/10 text-rup-emerald border-rup-emerald/30"
                            : "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                        }`}>
                          {member.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 truncate font-mono">
                          <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          {member.email}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {t("addedDate", { date: member.joinedAt })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {member.isOwnerAccount ? (
                      <span className="text-[11px] font-semibold text-gray-500 px-3 py-1 bg-void-deep rounded-lg border border-void-border">
                        {t("primaryAccount")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMemberToRevoke(member)}
                        className="p-2 rounded-xl text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 border border-transparent hover:border-nova-flare/30 transition-all cursor-pointer"
                        title={t("revokeAccess")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL INLINE DE CONFIRMACIÓN DE REVOCACIÓN (Zero browser confirm) */}
      {memberToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-deep/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-void-surface border border-nova-flare/40 rounded-3xl p-6 shadow-[0_0_35px_rgba(255,46,99,0.2)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-nova-flare/15 border border-nova-flare/40 flex items-center justify-center text-nova-flare shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {t("revokeTitle")}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t.rich("revokeConfirmQuestion", {
                    name: memberToRevoke.name,
                    email: memberToRevoke.email,
                    strong: (chunks) => <span className="font-bold text-white">{chunks}</span>,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setMemberToRevoke(null)}
                className="px-4 py-2 rounded-xl bg-void-deep border border-void-border text-gray-300 text-xs font-bold hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                {t("cancelBtn")}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmRevoke}
                className="px-5 py-2 rounded-xl bg-nova-flare text-white text-xs font-bold hover:brightness-110 shadow-[0_0_15px_rgba(255,46,99,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("revoking")}</span>
                  </>
                ) : (
                  <span>{t("revokeConfirmBtn")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INVITACIÓN DE MIEMBRO */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-deep/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-void-surface border border-void-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-plasma-cyan" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t("inviteModalTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              {t("inviteModalDesc")}
            </p>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  {t("fullNameLabel")}
                </label>
                <input
                  type="text"
                  placeholder={t("fullNamePlaceholder")}
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  {t("emailLabel")}
                </label>
                <input
                  type="email"
                  required
                  placeholder={t("emailPlaceholder")}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  {t("roleLabel")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Coordinator", "Reviewer"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        inviteRole === r
                          ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                          : "bg-void-deep border-void-border text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      <div className="text-xs font-bold">{r}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {r === "Coordinator" ? "Create & Edit Calls" : "Review Dossiers"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-void-border">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-void-deep border border-void-border text-gray-300 text-xs font-bold hover:text-white transition-all cursor-pointer"
                >
                  {t("cancelBtn")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-plasma-cyan text-void-deep text-xs font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("dispatching")}</span>
                    </>
                  ) : (
                    <span>{t("dispatchInviteBtn")}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamClient;

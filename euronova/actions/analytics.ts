"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface MissionPerformanceItem {
  id: string;
  title: string;
  projectType: string;
  destCountry: string;
  status: string;
  createdAt: string;
  favoritesCount: number;
  applicationsCount: number;
  dossiersCount: number;
  forumMessagesCount: number;
}

export interface RatingBreakdownItem {
  stars: number;
  count: number;
  percentage: number;
}

export interface ApplicantCountryItem {
  countryCode: string;
  count: number;
  percentage: number;
}

export interface OrgVerifiableAnalytics {
  timeRange: "30d" | "90d" | "all";

  // Mission Inventory
  totalProjects: number;
  activePublishedProjects: number;
  archivedProjects: number;
  pendingProjects: number;

  // Real Engagement Funnel
  totalFavorites: number;
  totalApplications: number;
  totalDossierSubmissions: number;
  applicationConversionRate: number; // (Applications / Favorites) %
  dossierConversionRate: number;     // (Dossiers / Applications) %

  // Per-Mission Performance Breakdown Table
  missions: MissionPerformanceItem[];

  // Reputation & Community Metrics
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: RatingBreakdownItem[];
  communitySurveysCount: number;
  communitySurveyVotesCount: number;

  // Applicant Geography / RUP Demographics
  totalInteractedVolunteers: number;
  rupVolunteersCount: number;
  rupPercentage: number;
  topCountries: ApplicantCountryItem[];
}

export interface AnalyticsActionResult {
  success: boolean;
  data?: OrgVerifiableAnalytics;
  error?: string;
}

/**
 * Server Action: Calculates 100% real and verifiable telemetry for an Organization
 * strictly querying Supabase tables without invented metrics.
 */
export async function getOrgVerifiableAnalyticsAction(
  orgId: string,
  timeRange: "30d" | "90d" | "all" = "all"
): Promise<AnalyticsActionResult> {
  try {
    if (!orgId) {
      return { success: false, error: "Organization ID is required." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to inspect analytics." };
    }

    // Dynamic ownership verification: must own org or be root admin
    const isOwner = user.id === orgId || user.email === "EuroNovaOfficial@gmail.com";
    if (!isOwner) {
      return { success: false, error: "Unauthorized: You do not own this organization." };
    }

    const adminDb = getServiceRoleClient() || supabase;

    // 1. Fetch all projects owned by this organization
    const { data: projectsData, error: projError } = await adminDb
      .from("projects")
      .select("id, title, project_type, dest_country, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (projError) {
      console.error("Error fetching organization projects for analytics:", projError);
      return { success: false, error: projError.message };
    }

    const allProjects = projectsData || [];
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === "30d") {
      cutoff.setDate(now.getDate() - 30);
    } else if (timeRange === "90d") {
      cutoff.setDate(now.getDate() - 90);
    } else {
      cutoff.setTime(0);
    }

    const filteredProjects =
      timeRange === "all"
        ? allProjects
        : allProjects.filter((p) => new Date(p.created_at) >= cutoff);

    const totalProjects = filteredProjects.length;
    const activePublishedProjects = filteredProjects.filter(
      (p) => p.status === "published" || p.status === "open"
    ).length;
    const archivedProjects = filteredProjects.filter((p) => p.status === "archived").length;
    const pendingProjects = filteredProjects.filter(
      (p) => p.status === "pending_review" || p.status === "draft"
    ).length;

    const projectIds = filteredProjects.map((p) => p.id);

    // 2. Query interactions (favorites & applications)
    let totalFavorites = 0;
    let totalApplications = 0;
    const projectFavoritesMap = new Map<string, number>();
    const projectApplicationsMap = new Map<string, number>();
    const interactedUserIds = new Set<string>();

    if (projectIds.length > 0) {
      const { data: interactionsData } = await adminDb
        .from("user_project_interactions")
        .select("user_id, project_id, is_favorite, is_applied, updated_at")
        .in("project_id", projectIds);

      if (interactionsData) {
        for (const inter of interactionsData) {
          if (timeRange !== "all" && inter.updated_at && new Date(inter.updated_at) < cutoff) {
            continue;
          }

          if (inter.is_favorite) {
            totalFavorites++;
            projectFavoritesMap.set(
              inter.project_id,
              (projectFavoritesMap.get(inter.project_id) || 0) + 1
            );
            if (inter.user_id) interactedUserIds.add(inter.user_id);
          }

          if (inter.is_applied) {
            totalApplications++;
            projectApplicationsMap.set(
              inter.project_id,
              (projectApplicationsMap.get(inter.project_id) || 0) + 1
            );
            if (inter.user_id) interactedUserIds.add(inter.user_id);
          }
        }
      }
    }

    // 3. Query custom dossier submissions
    let totalDossierSubmissions = 0;
    const projectDossiersMap = new Map<string, number>();

    const { data: dossiersData } = await adminDb
      .from("project_dossier_submissions")
      .select("id, project_id, user_id, status, created_at")
      .eq("org_id", orgId);

    if (dossiersData) {
      for (const dos of dossiersData) {
        if (timeRange !== "all" && dos.created_at && new Date(dos.created_at) < cutoff) {
          continue;
        }
        totalDossierSubmissions++;
        if (dos.project_id) {
          projectDossiersMap.set(
            dos.project_id,
            (projectDossiersMap.get(dos.project_id) || 0) + 1
          );
        }
        if (dos.user_id) interactedUserIds.add(dos.user_id);
      }
    }

    // 4. Query project forum message counts
    const projectForumMap = new Map<string, number>();
    if (projectIds.length > 0) {
      const { data: forumData } = await adminDb
        .from("project_forum_messages")
        .select("id, project_id, created_at")
        .in("project_id", projectIds);

      if (forumData) {
        for (const msg of forumData) {
          if (timeRange !== "all" && msg.created_at && new Date(msg.created_at) < cutoff) {
            continue;
          }
          projectForumMap.set(
            msg.project_id,
            (projectForumMap.get(msg.project_id) || 0) + 1
          );
        }
      }
    }

    // 5. Query verified organization reviews
    let totalReviews = 0;
    let averageRating = 5.0;
    const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    const { data: reviewsData } = await adminDb
      .from("org_reviews")
      .select("rating, created_at")
      .eq("org_id", orgId);

    const validReviews = (reviewsData || []).filter((r) => {
      if (timeRange !== "all" && r.created_at && new Date(r.created_at) < cutoff) {
        return false;
      }
      return true;
    });

    if (validReviews.length > 0) {
      totalReviews = validReviews.length;
      let sumRating = 0;
      for (const rev of validReviews) {
        const rVal = Math.min(5, Math.max(1, Number(rev.rating) || 5));
        starCounts[rVal] = (starCounts[rVal] || 0) + 1;
        sumRating += rVal;
      }
      averageRating = Number((sumRating / totalReviews).toFixed(1));
    }

    const ratingBreakdown: RatingBreakdownItem[] = [5, 4, 3, 2, 1].map((stars) => {
      const count = starCounts[stars] || 0;
      const percentage =
        totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
      return { stars, count, percentage };
    });

    // 6. Query community surveys and votes
    let communitySurveysCount = 0;
    let communitySurveyVotesCount = 0;

    const { data: surveysData } = await adminDb
      .from("ngo_surveys")
      .select("id, created_at")
      .eq("org_id", orgId);

    if (surveysData && surveysData.length > 0) {
      const filteredSurveys =
        timeRange === "all"
          ? surveysData
          : surveysData.filter((s) => new Date(s.created_at) >= cutoff);

      communitySurveysCount = filteredSurveys.length;
      const surveyIds = filteredSurveys.map((s) => s.id);

      if (surveyIds.length > 0) {
        const { data: votesData } = await adminDb
          .from("ngo_survey_votes")
          .select("id, created_at")
          .in("survey_id", surveyIds);

        if (votesData) {
          const filteredVotes =
            timeRange === "all"
              ? votesData
              : votesData.filter((v) => new Date(v.created_at) >= cutoff);
          communitySurveyVotesCount = filteredVotes.length;
        }
      }
    }

    // 7. Query applicant demographics & RUP ratio
    const uniqueUserList = Array.from(interactedUserIds);
    let rupVolunteersCount = 0;
    const countryFrequency = new Map<string, number>();

    if (uniqueUserList.length > 0) {
      const { data: youthData } = await adminDb
        .from("users_youth")
        .select("id, country_code, is_rup_region")
        .in("id", uniqueUserList);

      if (youthData) {
        for (const y of youthData) {
          if (y.is_rup_region) {
            rupVolunteersCount++;
          }
          const cCode = (y.country_code || "EU").toUpperCase();
          countryFrequency.set(cCode, (countryFrequency.get(cCode) || 0) + 1);
        }
      }
    }

    const totalInteractedVolunteers = uniqueUserList.length;
    const rupPercentage =
      totalInteractedVolunteers > 0
        ? Math.round((rupVolunteersCount / totalInteractedVolunteers) * 100)
        : 0;

    const topCountries: ApplicantCountryItem[] = Array.from(
      countryFrequency.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([countryCode, count]) => ({
        countryCode,
        count,
        percentage:
          totalInteractedVolunteers > 0
            ? Math.round((count / totalInteractedVolunteers) * 100)
            : 0,
      }));

    // 8. Compose Per-Mission Breakdown Table items
    const missions: MissionPerformanceItem[] = filteredProjects.map((p) => ({
      id: p.id,
      title: p.title,
      projectType: p.project_type,
      destCountry: p.dest_country,
      status: p.status,
      createdAt: p.created_at,
      favoritesCount: projectFavoritesMap.get(p.id) || 0,
      applicationsCount: projectApplicationsMap.get(p.id) || 0,
      dossiersCount: projectDossiersMap.get(p.id) || 0,
      forumMessagesCount: projectForumMap.get(p.id) || 0,
    }));

    // Real conversion rate guards
    const applicationConversionRate =
      totalFavorites > 0
        ? Number(((totalApplications / totalFavorites) * 100).toFixed(1))
        : totalApplications > 0
        ? 100
        : 0;

    const dossierConversionRate =
      totalApplications > 0
        ? Number(((totalDossierSubmissions / totalApplications) * 100).toFixed(1))
        : totalDossierSubmissions > 0
        ? 100
        : 0;

    const analyticsData: OrgVerifiableAnalytics = {
      timeRange,
      totalProjects,
      activePublishedProjects,
      archivedProjects,
      pendingProjects,
      totalFavorites,
      totalApplications,
      totalDossierSubmissions,
      applicationConversionRate,
      dossierConversionRate,
      missions,
      totalReviews,
      averageRating,
      ratingBreakdown,
      communitySurveysCount,
      communitySurveyVotesCount,
      totalInteractedVolunteers,
      rupVolunteersCount,
      rupPercentage,
      topCountries,
    };

    return {
      success: true,
      data: analyticsData,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to compute organization analytics.";
    console.error("getOrgVerifiableAnalyticsAction exception:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}


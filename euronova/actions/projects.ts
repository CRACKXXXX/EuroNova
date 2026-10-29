"use server";

import { createClient } from "@/utils/supabase/server";
import { createHash } from "crypto";
import {
  extractPortalExternalId,
  extractDistinctiveTokens,
  calculateSemanticTitleSimilarity,
} from "@/lib/formatters/projectDescription";

export interface RandomProjectResult {
  id?: string;
  error?: string;
}

export interface DuplicateCheckParams {
  title: string;
  dest_country?: string | null;
  official_url?: string | null;
  start_date?: string | null;
  project_type?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateId?: string;
  reason?: string;
  externalId?: string | null;
  contentHash?: string;
  error?: string;
}

/**
 * Generates an immutable, deterministic SHA-256 content hash for deduplication.
 */
function generateProjectContentHash(params: DuplicateCheckParams): string {
  const externalId = params.official_url ? extractPortalExternalId(params.official_url) : null;
  const country = (params.dest_country || "XX").trim().toUpperCase();
  const type = (params.project_type || "YE").trim().toUpperCase();
  const tokens = extractDistinctiveTokens(params.title).slice(0, 8).join(" ");
  const dateKey = params.start_date ? params.start_date.slice(0, 7) : "TBA";

  const rawSeed = externalId
    ? `EXT:${externalId}`
    : `SEM:${country}|${type}|${dateKey}|${tokens}`;

  return createHash("sha256").update(rawSeed).digest("hex");
}

/**
 * Server Action: Validates whether a mission is an exact or semantic duplicate in Supabase.
 */
export async function checkProjectDuplicateAction(
  params: DuplicateCheckParams
): Promise<DuplicateCheckResult> {
  try {
    const supabase = await createClient();
    const externalId = params.official_url ? extractPortalExternalId(params.official_url) : null;
    const contentHash = generateProjectContentHash(params);

    // 1. Check exact official URL
    if (params.official_url && params.official_url.trim()) {
      const { data: byUrl } = await supabase
        .from("projects")
        .select("id, title")
        .eq("official_url", params.official_url.trim())
        .maybeSingle();

      if (byUrl) {
        return {
          isDuplicate: true,
          duplicateId: byUrl.id,
          reason: "Exact official application URL match in database.",
          externalId,
          contentHash,
        };
      }
    }

    // 2. Check external portal ID embedded in URL
    if (externalId) {
      const idNumber = externalId.split(":")[1];
      if (idNumber) {
        const { data: byExtId } = await supabase
          .from("projects")
          .select("id, title, official_url")
          .ilike("official_url", `%${idNumber}%`)
          .limit(1);

        if (byExtId && byExtId.length > 0) {
          return {
            isDuplicate: true,
            duplicateId: byExtId[0].id,
            reason: `External portal ID match (${externalId}) in database.`,
            externalId,
            contentHash,
          };
        }
      }
    }

    // 3. Check semantic title + destination country match
    if (params.dest_country && params.title && params.title.trim()) {
      const { data: candidates } = await supabase
        .from("projects")
        .select("id, title, dest_country")
        .eq("dest_country", params.dest_country.trim().toUpperCase())
        .limit(50);

      if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
          const similarity = calculateSemanticTitleSimilarity(params.title, candidate.title);
          if (similarity >= 0.8) {
            return {
              isDuplicate: true,
              duplicateId: candidate.id,
              reason: `High semantic title similarity (${Math.round(similarity * 100)}%) in same destination country.`,
              externalId,
              contentHash,
            };
          }
        }
      }
    }

    return {
      isDuplicate: false,
      externalId,
      contentHash,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected deduplication error.";
    return {
      isDuplicate: false,
      error: message,
    };
  }
}

/**
 * Retorna un ID aleatorio de un proyecto publicado.
 */
export async function getRandomProjectIdAction(): Promise<RandomProjectResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("status", "published")
      .limit(100);

    if (error) {
      return { error: error.message };
    }

    if (!data || data.length === 0) {
      return { error: "No published projects found." };
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    return { id: data[randomIndex].id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error occurred.";
    return { error: message };
  }
}

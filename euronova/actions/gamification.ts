"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { 
  calculateLevelFromXp, 
  calculateLevelProgress, 
  XP_CONFIG,
  getTrustXpMultiplier,
  calculateTrustMultiplierXp,
} from "@/lib/gamification";
import { getUserRole } from "@/lib/roles";

export interface AwardXpOptions {
  amount: number;
  reason: string;
  actionType?: string;
  targetId?: string;
  trustBoost?: number;
}

export interface AwardXpResult {
  success: boolean;
  xp?: number;
  level?: number;
  prevLevel?: number;
  leveledUp?: boolean;
  gained?: number;
  baseXp?: number;
  multiplier?: number;
  reason?: string;
  error?: string;
  dailyCapReached?: boolean;
}

export interface UserGamificationData {
  userId: string;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
  xpToNextLevel: number;
  trustScore: number;
}

/**
 * Retorna una instancia blindada con credenciales service_role para
 * mutar columnas protegidas (xp, trust_score, user_xp_logs).
 */
function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role credentials missing.");
  }
  return createAdminClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Motor centralizado y blindado contra farming para otorgar XP en Supabase.
 * Actualiza estrictamente la columna `xp` en `public.users_youth` y registra
 * cada recompensa en `public.user_xp_logs` usando service_role para sortear
 * de forma segura los triggers de protección de columnas.
 */
export async function awardUserXp(
  optionsOrAmount: number | AwardXpOptions,
  legacyReason?: string,
  legacyActionType?: string,
  legacyTargetId?: string
): Promise<AwardXpResult> {
  try {
    let amount: number;
    let reason: string;
    let actionType: string | undefined;
    let targetId: string | undefined;
    let trustBoost: number | undefined;

    if (typeof optionsOrAmount === "object" && optionsOrAmount !== null) {
      amount = optionsOrAmount.amount;
      reason = optionsOrAmount.reason;
      actionType = optionsOrAmount.actionType;
      targetId = optionsOrAmount.targetId;
      trustBoost = optionsOrAmount.trustBoost;
    } else {
      amount = optionsOrAmount;
      reason = legacyReason || "Platform engagement";
      actionType = legacyActionType;
      targetId = legacyTargetId;
    }

    if (!amount || amount <= 0) {
      return { success: false, error: "Invalid XP amount." };
    }

    // 1. Validar autenticación estricta del usuario que invoca
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to earn XP." };
    }

    // Verificar si el usuario es una Organización (solo voluntarios acumulan XP)
    const role: string = user.user_metadata?.role || "youth";
    if (role === "org") {
      return { success: false, error: "Organizations do not accumulate youth volunteer XP." };
    }

    const adminDb = getAdminDb();

    // 2. MECANISMO ESTRICTO ANTI-FARMING: Verificar si la acción ya fue premiada
    if (actionType && targetId) {
      const { data: existingLog, error: logCheckError } = await adminDb
        .from("user_xp_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("action_type", actionType)
        .eq("target_id", targetId)
        .maybeSingle();

      if (logCheckError) {
        console.error("Could not check user_xp_logs:", logCheckError.message);
      }

      if (existingLog) {
        return {
          success: false,
          gained: 0,
          reason: "XP already awarded for this action.",
          error: "XP already claimed."
        };
      }
    }

    // 3. Obtener la experiencia actual en users_youth mediante service_role
    const { data: youth, error: selectError } = await adminDb
      .from("users_youth")
      .select("id, xp, trust_score")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      return { success: false, error: selectError.message };
    }

    let currentXp = 0;
    let currentTrust = 30;
    if (youth && typeof youth.xp === "number") {
      currentXp = Math.max(0, youth.xp);
      currentTrust = typeof youth.trust_score === "number" ? youth.trust_score : 30;
    } else {
      // Si el registro de voluntario no existía, inicializarlo de forma segura
      const { error: insertError } = await adminDb
        .from("users_youth")
        .upsert({ id: user.id, xp: 0, trust_score: 30 }, { onConflict: "id" });
      if (insertError) {
        return { success: false, error: insertError.message };
      }
      currentXp = 0;
      currentTrust = 30;
    }

    // 4. Cálculos matemáticos con Curva Exponencial y Multiplicador Dinámico por Trust Factor
    const baseXp = Math.max(0, Math.floor(amount));
    const multiplier = getTrustXpMultiplier(currentTrust);
    const gained = calculateTrustMultiplierXp(baseXp, currentTrust);
    const newXp = currentXp + gained;
    const prevLevel = calculateLevelFromXp(currentXp);
    const newLevel = calculateLevelFromXp(newXp);
    const leveledUp = newLevel > prevLevel;

    // 5. Registrar en user_xp_logs (vía service_role)
    if (actionType && targetId) {
      const { error: logInsertError } = await adminDb
        .from("user_xp_logs")
        .insert({
          user_id: user.id,
          action_type: actionType,
          target_id: targetId,
          xp_amount: gained,
          reason: multiplier !== 1.0 ? `${reason} (${multiplier}x Trust Multiplier)` : reason,
        });

      if (logInsertError) {
        if (logInsertError.code === "23505") {
          return {
            success: false,
            gained: 0,
            reason: "XP already awarded for this action.",
            error: "XP already claimed."
          };
        }
        return { success: false, error: logInsertError.message };
      }
    }

    // 6. Persistir nuevo XP y Trust Score en Supabase vía service_role (estrictamente acotados)
    const safeNewXp = Math.max(0, newXp);
    const newTrustScore = typeof trustBoost === "number" && trustBoost !== 0
      ? Math.max(0, Math.min(100, currentTrust + trustBoost))
      : Math.max(0, Math.min(100, currentTrust));

    const updatePayload: { xp: number; trust_score?: number } = { xp: safeNewXp };
    if (newTrustScore !== currentTrust) {
      updatePayload.trust_score = newTrustScore;
    }

    const { error: updateError } = await adminDb
      .from("users_youth")
      .update(updatePayload)
      .eq("id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 7. Revalidar rutas donde se muestra el perfil y gamificación
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/my-missions");

    // 8. Despachar notificación omnicanal de progresión si subió de nivel
    if (leveledUp && newLevel) {
      try {
        const [{ dispatchNotification }, { getLevelTierDetails }] = await Promise.all([
          import("@/actions/notifications"),
          import("@/components/UserLevelBadge"),
        ]);
        const tierDetails = getLevelTierDetails(newLevel);
        await dispatchNotification({
          userId: user.id,
          type: "progression",
          title: "Orbital Level Up!",
          message: `Congratulations! You leveled up to Level ${newLevel}! Tier unlocked: ${tierDetails.title}.`,
          actionUrl: "/dashboard/profile",
        });
      } catch (notifErr) {
        console.error("Could not dispatch leveling notification:", notifErr);
      }
    }

    return {
      success: true,
      xp: newXp,
      level: newLevel,
      prevLevel,
      leveledUp,
      gained,
      baseXp,
      multiplier,
      reason,
    };
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return {
        success: false,
        gained: 0,
        reason: "XP already awarded for this action.",
        error: "XP already claimed.",
      };
    }
    const message = err instanceof Error ? err.message : "Unexpected error in XP engine.";
    return { success: false, error: message };
  }
}

/**
 * Recompensa pasiva por participación diaria (+2 XP) con límite estricto en BD:
 * Máximo +10 XP por día calendario.
 */
export async function awardDailyEngagementXp(): Promise<AwardXpResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const today = new Date().toISOString().slice(0, 10);
    const adminDb = getAdminDb();

    // Contar cuánto XP pasivo ya ha ganado hoy con service_role para evitar stale reads
    const { data: todayLogs, error: logsError } = await adminDb
      .from("user_xp_logs")
      .select("xp_amount")
      .eq("user_id", user.id)
      .eq("action_type", "daily_passive")
      .like("target_id", `${today}%`);

    if (logsError) {
      console.error("Could not query daily passive logs:", logsError.message);
    }

    const totalToday = (todayLogs || []).reduce((sum, item) => sum + (item.xp_amount || 0), 0);
    const dailyCap = XP_CONFIG.DAILY_PASSIVE.dailyCap;
    const maxSlots = Math.ceil(dailyCap / XP_CONFIG.DAILY_PASSIVE.amount);
    const currentSlotCount = todayLogs?.length || 0;

    if (totalToday >= dailyCap || currentSlotCount >= maxSlots) {
      return {
        success: false,
        gained: 0,
        dailyCapReached: true,
        reason: `Daily orbital passive browsing cap reached (${dailyCap}/${dailyCap} XP).`,
        error: "Daily passive XP cap reached.",
      };
    }

    const remainingQuota = Math.max(0, dailyCap - totalToday);
    const amountToAward = Math.min(XP_CONFIG.DAILY_PASSIVE.amount, remainingQuota);
    const slotIndex = currentSlotCount + 1;
    const targetId = `${today}_slot_${slotIndex}`;

    return await awardUserXp({
      amount: amountToAward,
      reason: `Daily Orbital Exploration (Bonus ${slotIndex})`,
      actionType: "daily_passive",
      targetId,
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return {
        success: false,
        gained: 0,
        dailyCapReached: true,
        error: "XP already claimed.",
      };
    }
    const message = err instanceof Error ? err.message : "Error awarding passive XP.";
    return { success: false, error: message };
  }
}

/**
 * Consulta en tiempo real de los datos de gamificación del usuario autenticado
 * utilizando la progresión exponencial matemática.
 */
export async function getUserGamificationData(): Promise<UserGamificationData | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: youth, error } = await supabase
      .from("users_youth")
      .select("id, xp, trust_score")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !youth) {
      return null;
    }

    const safeXp = Math.max(0, typeof youth.xp === "number" ? youth.xp : 0);
    const trustScore = Math.max(0, Math.min(100, typeof youth.trust_score === "number" ? youth.trust_score : 30));
    const progress = calculateLevelProgress(safeXp);

    return {
      userId: user.id,
      xp: safeXp,
      level: progress.level,
      currentLevelXp: progress.currentLevelXp,
      nextLevelXp: progress.nextLevelXp,
      progressPercentage: progress.progressPercentage,
      xpToNextLevel: progress.xpToNextLevel,
      trustScore,
    };
  } catch (err: unknown) {
    console.error("Could not fetch gamification data:", err);
    return null;
  }
}

/**
 * Aplica una penalización verificada al Trust Score del usuario estrictamente
 * delimitado en [0, 100], utilizando service_role para evitar bloqueos del trigger.
 * Requiere estrictamente permisos de Moderador, Administrador o Root.
 */
export async function penalizeTrustScore(
  targetUserId: string,
  deduction: number
): Promise<{ success: boolean; newScore?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to penalize trust score." };
    }

    const role = await getUserRole(user.id, user.email);
    const canPenalize = role === "admin" || role === "root" || role === "moderator" || user.email === "euronovaofficial@gmail.com";

    if (!canPenalize) {
      return { success: false, error: "Unauthorized: Insufficient staff permissions to penalize trust score." };
    }

    const adminDb = getAdminDb();
    const { data: youth, error: selectError } = await adminDb
      .from("users_youth")
      .select("trust_score")
      .eq("id", targetUserId)
      .maybeSingle();

    if (selectError) return { success: false, error: selectError.message };

    const currentScore = typeof youth?.trust_score === "number" ? youth.trust_score : 30;
    const newScore = Math.max(0, Math.min(100, currentScore - Math.abs(deduction)));

    const { error: updateError } = await adminDb
      .from("users_youth")
      .update({ trust_score: newScore })
      .eq("id", targetUserId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath("/dashboard/profile");
    return { success: true, newScore };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error penalizing trust score" };
  }
}

/**
 * Otorga recompensa por finalización verificada de proyecto a un voluntario:
 * +25 Trust Score, +150 XP (protegido contra farming y ejecutado con service_role).
 * Requiere que el invocador sea la ONG propietaria del proyecto o un Administrador.
 */
export async function awardVerifiedProjectCompletionAction({
  volunteerId,
  projectId,
}: {
  volunteerId: string;
  projectId: string;
}): Promise<AwardXpResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to verify project completion." };
    }

    const role = await getUserRole(user.id, user.email);
    const isElevated = role === "admin" || role === "root" || user.email === "euronovaofficial@gmail.com";

    if (!isElevated) {
      const { data: project, error: projErr } = await supabase
        .from("projects")
        .select("org_id")
        .eq("id", projectId)
        .maybeSingle();

      if (projErr || !project || project.org_id !== user.id) {
        return {
          success: false,
          error: "Unauthorized: Only the project coordinator organization or staff can verify completion.",
        };
      }
    }

    const adminDb = getAdminDb();
    const targetId = `completion_${projectId}_${volunteerId}`;

    // Verificación anti-farming: comprobar si la acción ya fue premiada
    const { data: existingLog } = await adminDb
      .from("user_xp_logs")
      .select("id")
      .eq("user_id", volunteerId)
      .eq("action_type", XP_CONFIG.PROJECT_COMPLETION.actionType)
      .eq("target_id", targetId)
      .maybeSingle();

    if (existingLog) {
      return {
        success: false,
        gained: 0,
        reason: "Project completion XP already awarded for this volunteer.",
        error: "XP already claimed.",
      };
    }

    // Obtener voluntario y actualizar experiencia y trust score
    const { data: youth, error: selectError } = await adminDb
      .from("users_youth")
      .select("id, xp, trust_score")
      .eq("id", volunteerId)
      .maybeSingle();

    if (selectError || !youth) {
      return { success: false, error: "Volunteer profile not found." };
    }

    const currentXp = Math.max(0, typeof youth.xp === "number" ? youth.xp : 0);
    const currentTrust = typeof youth.trust_score === "number" ? youth.trust_score : 30;
    const multiplier = getTrustXpMultiplier(currentTrust);
    const gained = calculateTrustMultiplierXp(XP_CONFIG.PROJECT_COMPLETION.amount, currentTrust);
    const newXp = currentXp + gained;
    const newTrust = Math.max(0, Math.min(100, currentTrust + XP_CONFIG.PROJECT_COMPLETION.trustBoost));

    await adminDb
      .from("users_youth")
      .update({ xp: newXp, trust_score: newTrust })
      .eq("id", volunteerId);

    const { error: logInsertErr } = await adminDb.from("user_xp_logs").insert({
      user_id: volunteerId,
      amount: gained,
      xp_amount: gained,
      action_type: XP_CONFIG.PROJECT_COMPLETION.actionType,
      target_id: targetId,
      reason: multiplier !== 1.0 
        ? `${XP_CONFIG.PROJECT_COMPLETION.reason} (${multiplier}x Trust Multiplier)` 
        : XP_CONFIG.PROJECT_COMPLETION.reason,
      created_at: new Date().toISOString(),
    });

    if (logInsertErr && logInsertErr.code === "23505") {
      return {
        success: false,
        gained: 0,
        reason: "Project completion XP already awarded for this volunteer.",
        error: "XP already claimed.",
      };
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/my-missions");

    return {
      success: true,
      xp: newXp,
      gained,
      baseXp: XP_CONFIG.PROJECT_COMPLETION.amount,
      multiplier,
      reason: XP_CONFIG.PROJECT_COMPLETION.reason,
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error verifying project completion" };
  }
}

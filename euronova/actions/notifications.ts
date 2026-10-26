"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Categorías oficiales de notificación en EuroNova (Arquitectura sin ATS nativo):
 * - "alert": Hitos de actividad, tracción de proyectos (marcadores/interés) y recordatorios de postulación externa.
 * - "moderation": Notificaciones de seguridad y resolución de reportes de proyectos.
 * - "progression": Logros de gamificación, ascensos de nivel orbital (XP) y desbloqueo de rangos.
 * - "action_required": Requisitos de credenciales para organizaciones y revisiones administrativas.
 * - "system": Emisiones globales de plataforma, verificación de organizaciones e integridad de perfil.
 */
export type NotificationType = "alert" | "moderation" | "progression" | "action_required" | "system";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  alert: boolean;
  moderation: boolean;
  progression: boolean;
  action_required: boolean;
  system: boolean;
  updated_at?: string;
}

export interface DispatchNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
}

export interface NotificationActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  muted?: boolean;
}

/**
 * Cliente con service_role para despachar notificaciones del sistema de forma fiable
 * sin estar restringido por el contexto de sesión del usuario emisor o del webhook.
 */
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials in environment variables.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Motor Centralizado de Despacho (Trigger Engine):
 * 1. Comprueba las preferencias del usuario receptor para la categoría solicitada.
 * 2. Si el usuario desactivó dicha categoría, omite el despacho de forma limpia (muted: true).
 * 3. Si está permitida o no ha definido preferencias, inserta la notificación en la base de datos.
 */
export async function dispatchNotification(
  payload: DispatchNotificationPayload
): Promise<NotificationActionResult<NotificationItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to dispatch notifications." };
    }

    const { userId, type, title, message, actionUrl } = payload;

    if (!userId || !type || !title || !message) {
      return { success: false, error: "Missing required notification fields." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Verificar preferencias del usuario receptor
    const { data: prefs, error: prefError } = await adminDb
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!prefError && prefs) {
      const isCategoryEnabled = prefs[type] ?? true;
      if (!isCategoryEnabled) {
        return { success: true, muted: true };
      }
    }

    // 2. Insertar notificación
    const { data: inserted, error: insertError } = await adminDb
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title: title.trim(),
        message: message.trim(),
        action_url: actionUrl ? actionUrl.trim() : null,
        is_read: false,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting notification:", insertError);
      return { success: false, error: insertError.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: inserted as NotificationItem };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to dispatch notification.";
    console.error("dispatchNotification exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Obtiene las notificaciones del usuario autenticado ordenadas por fecha reciente.
 */
export async function getNotifications(
  limit = 25
): Promise<NotificationActionResult<{ notifications: NotificationItem[]; unreadCount: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    const notifications = (data || []) as NotificationItem[];
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return {
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not fetch notifications.";
    return { success: false, error: message };
  }
}

/**
 * Consulta ultrarrápida del recuento de no leídas para el badge del Bell.
 */
export async function getUnreadNotificationCount(): Promise<NotificationActionResult<number>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: true, data: 0 };
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: error.message, data: 0 };
    }

    return { success: true, data: count ?? 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get unread count.";
    return { success: false, error: message, data: 0 };
  }
}

/**
 * Marca una notificación individual como leída.
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<NotificationActionResult<boolean>> {
  try {
    if (!notificationId) {
      return { success: false, error: "Invalid notification ID." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark as read.";
    return { success: false, error: message };
  }
}

/**
 * Marca todas las notificaciones del usuario autenticado como leídas.
 */
export async function markAllNotificationsAsRead(): Promise<NotificationActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark all as read.";
    return { success: false, error: message };
  }
}

/**
 * Elimina una notificación específica.
 */
export async function deleteNotification(
  notificationId: string
): Promise<NotificationActionResult<boolean>> {
  try {
    if (!notificationId) {
      return { success: false, error: "Invalid notification ID." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete notification.";
    return { success: false, error: message };
  }
}

/**
 * Obtiene las preferencias de notificación del usuario actual.
 * Si no existen registros aún, devuelve valores predeterminados (todos habilitados).
 */
export async function getNotificationPreferences(): Promise<NotificationActionResult<NotificationPreferences>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      const defaults: NotificationPreferences = {
        user_id: user.id,
        alert: true,
        moderation: true,
        progression: true,
        action_required: true,
        system: true,
      };
      return { success: true, data: defaults };
    }

    return { success: true, data: data as NotificationPreferences };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch notification preferences.";
    return { success: false, error: message };
  }
}

/**
 * Actualiza las preferencias de notificación para el usuario autenticado.
 */
export async function updateNotificationPreferences(
  preferences: Partial<Omit<NotificationPreferences, "user_id">>
): Promise<NotificationActionResult<NotificationPreferences>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { data: existing } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const merged = {
      user_id: user.id,
      alert: preferences.alert ?? existing?.alert ?? true,
      moderation: preferences.moderation ?? existing?.moderation ?? true,
      progression: preferences.progression ?? existing?.progression ?? true,
      action_required: preferences.action_required ?? existing?.action_required ?? true,
      system: preferences.system ?? existing?.system ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(merged, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: data as NotificationPreferences };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification preferences.";
    return { success: false, error: message };
  }
}

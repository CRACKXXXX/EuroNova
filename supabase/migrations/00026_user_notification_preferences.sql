-- Migration: 00026_user_notification_preferences.sql
-- Add user notification preferences: preferred email and personal Discord Webhook URL

-- 1. users_youth
ALTER TABLE public.users_youth
  ADD COLUMN IF NOT EXISTS notification_email TEXT,
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;

-- 2. users_org
ALTER TABLE public.users_org
  ADD COLUMN IF NOT EXISTS notification_email TEXT,
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;

-- ============================================================================
-- MIGRATION: 00031_support_tickets_preferred_contact.sql
-- DESCRIPTION: Add preferred_contact_method column to public.support_tickets.
-- GUARANTEE: Idempotent execution for zero-downtime migrations.
-- ============================================================================

ALTER TABLE public.support_tickets 
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT NOT NULL DEFAULT 'website';

COMMENT ON COLUMN public.support_tickets.preferred_contact_method IS 'Preferred contact method: website, email, or whatsapp';


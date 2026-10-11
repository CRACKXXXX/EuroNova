-- Migration: Secure RPC Fetcher to get user emails for admin panel
-- Enables batch retrieval of auth.users emails without N+1 queries

CREATE OR REPLACE FUNCTION get_admin_user_emails(user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ 
BEGIN   
  RETURN QUERY 
  SELECT au.id, au.email::text 
  FROM auth.users au 
  WHERE au.id = ANY(user_ids); 
END; 
$$;

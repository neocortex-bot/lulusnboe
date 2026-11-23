CREATE SCHEMA IF NOT EXISTS private;
ALTER FUNCTION public.start_preparation_practice(uuid) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.start_preparation_practice(uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.start_preparation_practice(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.start_preparation_practice(_case_id uuid)
 RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$ SELECT private.start_preparation_practice(_case_id); $$;
REVOKE ALL ON FUNCTION public.start_preparation_practice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_preparation_practice(uuid) TO authenticated;
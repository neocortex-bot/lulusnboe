REVOKE ALL ON public.case_final_reviews FROM anon, authenticated;
GRANT SELECT ON public.case_final_reviews TO authenticated;
GRANT ALL ON public.case_final_reviews TO service_role;
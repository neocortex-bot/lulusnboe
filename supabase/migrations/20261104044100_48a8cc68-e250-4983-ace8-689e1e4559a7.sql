DO $$
DECLARE _def text;
BEGIN
  SELECT pg_get_functiondef('public.reconcile_rubric_report(jsonb,jsonb)'::regprocedure) INTO _def;
  _def := replace(_def,
    'WHEN _possible = 0 THEN ''BELUM DINILAI''',
    'WHEN _possible = 0 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(_items) x WHERE NOT coalesce((x->>''pendingAssessment'')::boolean, false)) THEN ''BELUM DINILAI''');
  EXECUTE _def;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_rubric_report(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_rubric_report(jsonb,jsonb) TO service_role;
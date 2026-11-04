-- Run through Supabase read_query. Assertions exercise the deployed
-- pure reconciliation function without changing candidate data.
WITH report AS (
  SELECT '{"items":[{"item":"Critical","points":0,"maxPoints":2,"isCritical":true},{"item":"Correct","points":2,"maxPoints":2},{"item":"Manual","points":1,"maxPoints":2,"manualOverride":true,"evidenceQuote":"exact quote"}]}'::jsonb AS value
), outcomes AS (
 SELECT
 public.reconcile_rubric_report(value, '{"items":[{"text":"Critical","points":2,"isCritical":false},{"text":"Correct","points":2},{"text":"Manual","points":2}]}') AS critical,
 public.reconcile_rubric_report(value, '{"items":[{"text":"Correct","points":2},{"text":"Manual","points":2}]}') AS removed,
 public.reconcile_rubric_report(value, '{"items":[{"text":"Correct","points":4},{"text":"Manual","points":4}]}') AS weighted,
 public.reconcile_rubric_report(value, '{"items":[{"text":"New","points":2}]}') AS added
 FROM report
)
SELECT
 critical->>'hasCriticalFail' = 'false' AS changed_critical,
 (removed->>'totalPossible')::numeric = 4 AND (removed->>'totalScore')::numeric = 3 AND removed->>'passStatus' = 'LULUS' AND jsonb_array_length(removed->'items') = 2 AS removed_critical_passes,
 (weighted->>'totalPossible')::numeric = 8 AND (weighted->>'totalScore')::numeric = 5 AS new_weights,
 weighted->'items'->1->>'points' = '1' AND weighted->'items'->1->>'manualOverride' = 'true' AND weighted->'items'->1->>'evidenceQuote' = 'exact quote' AS preserves_manual,
 added->>'passStatus' = 'BELUM DINILAI' AS new_item_pending,
 public.reconcile_rubric_report(weighted, '{"items":[{"text":"Correct","points":4},{"text":"Manual","points":4}]}') = weighted AS idempotent
FROM outcomes;
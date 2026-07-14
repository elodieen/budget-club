-- Nettoyage des profils de test créés pendant la validation de la migration
-- RLS/RPC (rpc_smoke_test, TestRPC). À exécuter dans le SQL Editor Supabase —
-- l'app elle-même ne peut plus faire ce nettoyage (DELETE bloqué pour anon,
-- comportement voulu par la migration RLS).

DELETE FROM expenses WHERE month_id IN (
  SELECT id FROM budget_months WHERE profile_id IN ('rpc_smoke_test', 'user_1784030542681')
);
DELETE FROM bills WHERE month_id IN (
  SELECT id FROM budget_months WHERE profile_id IN ('rpc_smoke_test', 'user_1784030542681')
);
DELETE FROM revenues WHERE month_id IN (
  SELECT id FROM budget_months WHERE profile_id IN ('rpc_smoke_test', 'user_1784030542681')
);
DELETE FROM budget_months WHERE profile_id IN ('rpc_smoke_test', 'user_1784030542681');
DELETE FROM profiles WHERE id IN ('rpc_smoke_test', 'user_1784030542681');

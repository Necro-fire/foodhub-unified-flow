
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
-- restringe insert público de customers: apenas com nome+telefone preenchidos
DROP POLICY IF EXISTS "customers_public_insert" ON public.customers;
CREATE POLICY "customers_public_insert" ON public.customers FOR INSERT TO anon
  WITH CHECK (nome IS NOT NULL AND length(nome) > 0 AND telefone IS NOT NULL);

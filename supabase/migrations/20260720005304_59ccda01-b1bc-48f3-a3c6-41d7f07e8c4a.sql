-- role_permissions: which modules each role sees
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read permissions" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'proprietario')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'proprietario'));

-- Seed default matrix
INSERT INTO public.role_permissions (role, module, can_view, can_edit) VALUES
  ('proprietario','dashboard',true,true),('proprietario','pedidos',true,true),('proprietario','pdv',true,true),
  ('proprietario','mesas',true,true),('proprietario','caixa',true,true),('proprietario','vendas',true,true),
  ('proprietario','catalogo',true,true),('proprietario','usuarios',true,true),('proprietario','configuracoes',true,true),
  ('proprietario','suporte',true,true),('proprietario','kds',true,true),
  ('admin','dashboard',true,true),('admin','pedidos',true,true),('admin','pdv',true,true),
  ('admin','mesas',true,true),('admin','caixa',true,true),('admin','vendas',true,true),
  ('admin','catalogo',true,true),('admin','usuarios',true,true),('admin','configuracoes',true,true),
  ('admin','suporte',true,true),('admin','kds',true,true),
  ('gerente','dashboard',true,true),('gerente','pedidos',true,true),('gerente','pdv',true,true),
  ('gerente','mesas',true,true),('gerente','caixa',true,true),('gerente','vendas',true,false),
  ('gerente','catalogo',true,true),('gerente','suporte',true,false),('gerente','kds',true,false),
  ('caixa','pdv',true,true),('caixa','caixa',true,true),('caixa','vendas',true,false),('caixa','pedidos',true,true),
  ('garcom','mesas',true,true),('garcom','pedidos',true,true),('garcom','pdv',true,true),
  ('cozinha','kds',true,true),('cozinha','pedidos',true,true),
  ('producao','kds',true,true),('producao','pedidos',true,true),('producao','catalogo',true,false),
  ('estoque','catalogo',true,true),('estoque','pedidos',true,false),
  ('financeiro','vendas',true,false),('financeiro','caixa',true,true),('financeiro','dashboard',true,false),
  ('operador','pedidos',true,true),('operador','pdv',true,true),('operador','mesas',true,true),('operador','caixa',true,true)
ON CONFLICT (role, module) DO NOTHING;

-- Restaurant tables: extras
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS garcom_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ocupada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reserva_nome TEXT,
  ADD COLUMN IF NOT EXISTS reserva_telefone TEXT,
  ADD COLUMN IF NOT EXISTS reserva_horario TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mesa_pai_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_x INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y INT NOT NULL DEFAULT 0;

-- Add 'reservada' status possibility already in enum; ensure it exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'reservada' AND enumtypid = 'public.table_status'::regtype) THEN
    ALTER TYPE public.table_status ADD VALUE 'reservada';
  END IF;
END $$;

-- table_history log
CREATE TABLE IF NOT EXISTS public.table_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mesa_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.table_history TO authenticated;
GRANT ALL ON public.table_history TO service_role;
ALTER TABLE public.table_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read table history" ON public.table_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write table history" ON public.table_history FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Orders: delivery detail + cancel + waiter + split
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS rua TEXT,
  ADD COLUMN IF NOT EXISTS numero_endereco TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS ponto_referencia TEXT,
  ADD COLUMN IF NOT EXISTS garcom_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
  ADD COLUMN IF NOT EXISTS pagamentos JSONB;
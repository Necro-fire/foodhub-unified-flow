
CREATE TABLE public.cash_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  status TEXT NOT NULL DEFAULT 'aberta',
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  saldo_final NUMERIC,
  saldo_esperado NUMERIC,
  observacoes TEXT NOT NULL DEFAULT '',
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  aberto_por UUID,
  fechado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cash_sessions" ON public.cash_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cash_sessions_updated_at BEFORE UPDATE ON public.cash_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cash_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT,
  forma_pagamento TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cash_movements" ON public.cash_movements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cash_movements_updated_at BEFORE UPDATE ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX cash_movements_session_idx ON public.cash_movements(session_id);
CREATE INDEX cash_sessions_user_status_idx ON public.cash_sessions(user_id, status);

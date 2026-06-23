
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'entregue';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS horario_retirada TIMESTAMPTZ;

ALTER TABLE public.settings
  ALTER COLUMN nome_estabelecimento SET DEFAULT 'Minha Padaria',
  ALTER COLUMN descricao SET DEFAULT 'Pães, bolos e cafés artesanais',
  ALTER COLUMN horario_funcionamento SET DEFAULT 'Seg a Sáb — 6h às 20h',
  ALTER COLUMN cor_primaria SET DEFAULT '#8B5A2B';

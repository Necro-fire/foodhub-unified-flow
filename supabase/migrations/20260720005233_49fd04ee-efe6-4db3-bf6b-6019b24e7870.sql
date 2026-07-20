-- 1. Extend app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'proprietario';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'garcom';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cozinha';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'producao';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'estoque';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';
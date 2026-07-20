
-- SETTINGS (singleton id=1)
CREATE TABLE public.settings (
  id INTEGER PRIMARY KEY,
  nome_estabelecimento TEXT NOT NULL DEFAULT 'Padaria Pão Dourado',
  descricao TEXT,
  horario_funcionamento TEXT,
  telefone TEXT,
  endereco TEXT,
  taxa_entrega NUMERIC NOT NULL DEFAULT 0,
  aceita_pedidos_online BOOLEAN NOT NULL DEFAULT true,
  whatsapp_suporte TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read all" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings write authenticated" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.settings (id, nome_estabelecimento, descricao, horario_funcionamento, telefone, endereco)
VALUES (1, 'Padaria Pão Dourado', 'Pães artesanais, bolos, doces e cafés todos os dias.', '06:00 - 20:00', '', '');

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icone TEXT NOT NULL DEFAULT '🍽️',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories read all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories write authenticated" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  preco NUMERIC NOT NULL DEFAULT 0,
  preco_promo NUMERIC,
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products write authenticated" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RESTAURANT TABLES
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  capacidade INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'livre',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables read all" ON public.restaurant_tables FOR SELECT USING (true);
CREATE POLICY "tables write authenticated" ON public.restaurant_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER restaurant_tables_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS
CREATE SEQUENCE public.orders_numero_seq START 1000;
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT NOT NULL UNIQUE DEFAULT nextval('public.orders_numero_seq'),
  cliente_nome TEXT,
  cliente_telefone TEXT,
  cliente_endereco TEXT,
  bairro TEXT,
  horario_retirada TIMESTAMPTZ,
  origem TEXT NOT NULL DEFAULT 'online',
  tipo TEXT NOT NULL DEFAULT 'retirada',
  status TEXT NOT NULL DEFAULT 'novo',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  observacoes TEXT,
  mesa_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  finalizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT USAGE ON SEQUENCE public.orders_numero_seq TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders read all" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders insert all" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders update authenticated" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orders delete authenticated" ON public.orders FOR DELETE TO authenticated USING (true);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_created_at_idx ON public.orders(created_at);
CREATE INDEX orders_mesa_idx ON public.orders(mesa_id);

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items read all" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "order_items insert all" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items update authenticated" ON public.order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "order_items delete authenticated" ON public.order_items FOR DELETE TO authenticated USING (true);
CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- CASH_MOVEMENTS: add order_id link
ALTER TABLE public.cash_movements ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;


-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','operador','caixa');
CREATE TYPE public.order_status AS ENUM ('novo','confirmado','em_preparo','pronto','saiu_entrega','finalizado','cancelado');
CREATE TYPE public.order_origin AS ENUM ('pdv','mesa','online');
CREATE TYPE public.order_type AS ENUM ('retirada','local','entrega');
CREATE TYPE public.payment_method AS ENUM ('pix','dinheiro','credito','debito','vale','multiplo','nao_definido');
CREATE TYPE public.table_status AS ENUM ('livre','ocupada','reservada');
CREATE TYPE public.cash_movement_type AS ENUM ('entrada','saida','sangria','reforco','venda');
CREATE TYPE public.cash_session_status AS ENUM ('aberta','fechada');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)));
  -- primeiro usuário criado vira admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador');
  END IF;
  RETURN NEW;
END $$;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- trigger on auth.users (Supabase pattern)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SETTINGS (singleton) ============
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_estabelecimento TEXT NOT NULL DEFAULT 'Minha Pizzaria',
  descricao TEXT DEFAULT 'A melhor pizza artesanal da cidade',
  horario_funcionamento TEXT DEFAULT 'Ter a Dom — 18h às 23h',
  telefone TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  aceita_pedidos_online BOOLEAN NOT NULL DEFAULT true,
  cor_primaria TEXT DEFAULT '#C2410C',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select_all" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_update_admin" ON public.settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.settings (id) VALUES (1);

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0,
  icone TEXT DEFAULT '🍕',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_staff_write" ON public.categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  preco_promo NUMERIC(10,2) CHECK (preco_promo IS NULL OR preco_promo >= 0),
  imagem_url TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_staff_write" ON public.products FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_products_category ON public.products(category_id);

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_public_insert" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "customers_staff_all" ON public.customers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TABLES (mesas) ============
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL UNIQUE,
  capacidade INT NOT NULL DEFAULT 4,
  status table_status NOT NULL DEFAULT 'livre',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables_staff_all" ON public.restaurant_tables FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_tables_updated BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ORDERS ============
CREATE SEQUENCE public.order_number_seq START 1000;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL UNIQUE DEFAULT nextval('public.order_number_seq'),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  cliente_endereco TEXT,
  origem order_origin NOT NULL DEFAULT 'online',
  tipo order_type NOT NULL DEFAULT 'retirada',
  status order_status NOT NULL DEFAULT 'novo',
  mesa_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento payment_method NOT NULL DEFAULT 'nao_definido',
  pagamento_detalhes JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- pedidos online podem ser criados anonimamente
CREATE POLICY "orders_public_insert_online" ON public.orders FOR INSERT
  WITH CHECK (origem = 'online');
-- cliente pode consultar pelo número (acompanhamento)
CREATE POLICY "orders_public_select" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_staff_all" ON public.orders FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_orders_mesa ON public.orders(mesa_id);

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INT NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_public_insert" ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.origem = 'online'));
CREATE POLICY "order_items_public_select" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "order_items_staff_all" ON public.order_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- ============ CASH SESSIONS ============
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aberto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fechado_em TIMESTAMPTZ,
  saldo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_final NUMERIC(10,2),
  saldo_esperado NUMERIC(10,2),
  observacoes TEXT,
  status cash_session_status NOT NULL DEFAULT 'aberta'
);
GRANT SELECT, INSERT, UPDATE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_sessions_staff" ON public.cash_sessions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- garantir só uma sessão aberta
CREATE UNIQUE INDEX uniq_open_cash_session ON public.cash_sessions(status) WHERE status = 'aberta';

-- ============ CASH MOVEMENTS ============
CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  tipo cash_movement_type NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  forma_pagamento payment_method,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_movements_staff" ON public.cash_movements FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX idx_cash_mov_session ON public.cash_movements(session_id);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;

-- ============ SEED — categorias e produtos exemplo (pizzaria) ============
INSERT INTO public.categories (nome, slug, ordem, icone) VALUES
  ('Pizzas Salgadas','pizzas-salgadas',1,'🍕'),
  ('Pizzas Doces','pizzas-doces',2,'🍫'),
  ('Bebidas','bebidas',3,'🥤'),
  ('Sobremesas','sobremesas',4,'🍰'),
  ('Entradas','entradas',5,'🥗');

INSERT INTO public.products (category_id, nome, descricao, preco, ordem) VALUES
  ((SELECT id FROM public.categories WHERE slug='pizzas-salgadas'),'Margherita','Molho de tomate, muçarela, manjericão fresco e azeite',49.90,1),
  ((SELECT id FROM public.categories WHERE slug='pizzas-salgadas'),'Calabresa','Calabresa artesanal, cebola roxa e azeitonas pretas',54.90,2),
  ((SELECT id FROM public.categories WHERE slug='pizzas-salgadas'),'Quatro Queijos','Muçarela, gorgonzola, parmesão e provolone',62.90,3),
  ((SELECT id FROM public.categories WHERE slug='pizzas-salgadas'),'Portuguesa','Presunto, ovos, cebola, ervilha, azeitona e muçarela',58.90,4),
  ((SELECT id FROM public.categories WHERE slug='pizzas-salgadas'),'Frango Catupiry','Frango desfiado e catupiry cremoso',56.90,5),
  ((SELECT id FROM public.categories WHERE slug='pizzas-doces'),'Chocolate com Morango','Chocolate ao leite e morangos frescos',52.90,1),
  ((SELECT id FROM public.categories WHERE slug='pizzas-doces'),'Romeu e Julieta','Goiabada cremosa e queijo minas',49.90,2),
  ((SELECT id FROM public.categories WHERE slug='bebidas'),'Coca-Cola 2L','Refrigerante gelado',14.90,1),
  ((SELECT id FROM public.categories WHERE slug='bebidas'),'Guaraná Antarctica 2L','Refrigerante gelado',13.90,2),
  ((SELECT id FROM public.categories WHERE slug='bebidas'),'Suco de Laranja 500ml','Natural, sem açúcar',9.90,3),
  ((SELECT id FROM public.categories WHERE slug='bebidas'),'Água Mineral 500ml','Sem gás',4.00,4),
  ((SELECT id FROM public.categories WHERE slug='sobremesas'),'Petit Gateau','Bolinho de chocolate quente com sorvete',22.90,1),
  ((SELECT id FROM public.categories WHERE slug='sobremesas'),'Pudim de Leite','Receita da casa',12.90,2),
  ((SELECT id FROM public.categories WHERE slug='entradas'),'Pão de Alho','6 unidades, na chapa',16.90,1),
  ((SELECT id FROM public.categories WHERE slug='entradas'),'Bruschetta','Tomate, manjericão e azeite',18.90,2);

INSERT INTO public.restaurant_tables (numero, capacidade) VALUES
  (1,2),(2,2),(3,4),(4,4),(5,6),(6,6),(7,4),(8,8);

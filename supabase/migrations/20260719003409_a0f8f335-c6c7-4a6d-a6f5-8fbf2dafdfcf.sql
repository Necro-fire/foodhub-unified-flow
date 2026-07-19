
-- 1. Settings: WhatsApp support number
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS whatsapp_suporte text DEFAULT '';

-- 2. Categories
CREATE TABLE public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  icone text DEFAULT 'HelpCircle',
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_categories TO authenticated;
GRANT ALL ON public.support_categories TO service_role;
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_categories_select_auth" ON public.support_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "support_categories_admin_write" ON public.support_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_support_categories_updated
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Problems / Solutions
CREATE TABLE public.support_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.support_categories(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text DEFAULT '',
  causas text[] NOT NULL DEFAULT '{}',
  passos text[] NOT NULL DEFAULT '{}',
  observacoes text DEFAULT '',
  imagem_url text DEFAULT '',
  video_url text DEFAULT '',
  doc_url text DEFAULT '',
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_problems TO authenticated;
GRANT ALL ON public.support_problems TO service_role;
ALTER TABLE public.support_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_problems_select_auth" ON public.support_problems
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "support_problems_admin_write" ON public.support_problems
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_support_problems_updated
  BEFORE UPDATE ON public.support_problems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_support_problems_category ON public.support_problems(category_id);

-- 4. Tickets (history)
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.support_categories(id) ON DELETE SET NULL,
  problem_id uuid REFERENCES public.support_problems(id) ON DELETE SET NULL,
  categoria_nome text,
  problema_titulo text,
  resolvido boolean,
  encaminhado_whatsapp boolean NOT NULL DEFAULT false,
  descricao_adicional text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_tickets_select_own_or_admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "support_tickets_insert_own" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "support_tickets_update_own_or_admin" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);

-- 5. Ratings
CREATE TABLE public.support_ratings (
  ticket_id uuid PRIMARY KEY REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estrelas int NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ratings TO authenticated;
GRANT ALL ON public.support_ratings TO service_role;
ALTER TABLE public.support_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_ratings_select_own_or_admin" ON public.support_ratings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "support_ratings_insert_own" ON public.support_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Seed data
INSERT INTO public.support_categories (nome, slug, icone, ordem) VALUES
  ('Login e Acesso', 'login', 'LogIn', 1),
  ('Pedidos', 'pedidos', 'ClipboardList', 2),
  ('PDV', 'pdv', 'Calculator', 3),
  ('Caixa', 'caixa', 'Wallet', 4),
  ('Cadastro de Produtos', 'produtos', 'Package', 5),
  ('Impressão', 'impressao', 'Printer', 6),
  ('Clientes', 'clientes', 'Users', 7),
  ('Relatórios', 'relatorios', 'BarChart3', 8),
  ('Financeiro', 'financeiro', 'DollarSign', 9),
  ('Configurações', 'configuracoes', 'Settings', 10),
  ('Lentidão do Sistema', 'lentidao', 'Gauge', 11),
  ('Erros do Sistema', 'erros', 'AlertTriangle', 12),
  ('Integrações', 'integracoes', 'Plug', 13),
  ('Outros', 'outros', 'HelpCircle', 99);

-- PDV
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, observacoes, ordem)
SELECT id, 'Venda não finaliza',
  'A tela do PDV trava ou não conclui o pagamento ao finalizar a venda.',
  ARRAY['Conexão instável com a internet', 'Caixa não aberto', 'Forma de pagamento inválida'],
  ARRAY['Verifique se o caixa está aberto em Admin > Caixa.', 'Confirme a conexão com a internet.', 'Selecione novamente a forma de pagamento.', 'Se persistir, atualize a página (F5) e tente novamente.'],
  'Nenhum item já pago será perdido — pedidos ficam salvos com status "novo".', 1
FROM public.support_categories WHERE slug='pdv';

INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Produto não aparece no PDV',
  'Ao buscar, o produto desejado não é listado na tela de venda.',
  ARRAY['Produto marcado como inativo', 'Categoria desativada', 'Cache do navegador desatualizado'],
  ARRAY['Vá em Admin > Catálogo e verifique se o produto está ativo.', 'Confirme que a categoria dele também está ativa.', 'Atualize a página (Ctrl+F5).'], 2
FROM public.support_categories WHERE slug='pdv';

-- Caixa
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Não consigo abrir o caixa',
  'Ao tentar iniciar uma sessão de caixa, o sistema não permite ou já existe uma sessão aberta.',
  ARRAY['Existe uma sessão de caixa em aberto', 'Usuário sem permissão de caixa'],
  ARRAY['Acesse Admin > Caixa.', 'Se houver sessão em aberto, feche-a antes de abrir outra.', 'Confirme com o administrador que seu usuário tem papel de caixa ou admin.'], 1
FROM public.support_categories WHERE slug='caixa';

-- Login
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Não consigo entrar / esqueci a senha',
  'Você não recebe acesso ao painel ou esqueceu a senha de acesso.',
  ARRAY['Senha incorreta', 'E-mail não cadastrado', 'Acesso ainda não liberado pelo administrador'],
  ARRAY['Confirme se o e-mail está correto (sem espaços).', 'Use o link "Esqueci minha senha" na tela de login.', 'Se não receber o e-mail, verifique a caixa de spam.', 'Peça ao administrador para confirmar seu cadastro.'], 1
FROM public.support_categories WHERE slug='login';

-- Pedidos
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Pedido não aparece no Kanban',
  'Um pedido foi realizado mas não é exibido no quadro de pedidos.',
  ARRAY['Filtro aplicado no quadro', 'Pedido cancelado', 'Falha momentânea no realtime'],
  ARRAY['Limpe filtros no topo da página Pedidos.', 'Atualize a página (F5).', 'Consulte em Admin > Vendas para confirmar o registro.'], 1
FROM public.support_categories WHERE slug='pedidos';

INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Como avançar o status de um pedido',
  'Você precisa mover o pedido entre as colunas do Kanban.',
  ARRAY['Fluxo padrão: Novo → Em Produção → Pronto → (Em Rota, apenas entregas) → Entregue'],
  ARRAY['Abra Admin > Pedidos.', 'Clique no botão "Avançar" no card do pedido.', 'Pedidos de mesa e retirada pulam a etapa Em Rota.'], 1
FROM public.support_categories WHERE slug='pedidos';

-- Impressão
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Impressora não imprime o pedido',
  'Ao clicar em imprimir, nada acontece ou sai em branco.',
  ARRAY['Impressora offline', 'Pop-up bloqueado pelo navegador', 'Papel acabou'],
  ARRAY['Verifique se a impressora está ligada e com papel.', 'Autorize pop-ups do sistema no navegador.', 'Teste imprimir uma página de teste do sistema operacional.'], 1
FROM public.support_categories WHERE slug='impressao';

-- Produtos
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Como cadastrar um novo produto',
  'Você quer adicionar um item ao cardápio.',
  ARRAY['Produto ainda não existe no catálogo'],
  ARRAY['Acesse Admin > Catálogo.', 'Clique em "Novo produto".', 'Preencha nome, preço, categoria e imagem.', 'Marque como Ativo e Salve.'], 1
FROM public.support_categories WHERE slug='produtos';

-- Lentidão
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Sistema está lento',
  'As páginas demoram para carregar ou travam.',
  ARRAY['Conexão instável', 'Muitas abas abertas', 'Cache antigo'],
  ARRAY['Feche abas não utilizadas.', 'Limpe o cache do navegador (Ctrl+Shift+Del).', 'Teste em outra rede/Wi-Fi.', 'Reinicie o navegador.'], 1
FROM public.support_categories WHERE slug='lentidao';

-- Erros
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos, ordem)
SELECT id, 'Aparece uma mensagem de erro na tela',
  'O sistema exibiu um erro inesperado.',
  ARRAY['Falha momentânea', 'Dados inconsistentes'],
  ARRAY['Anote a mensagem de erro exibida.', 'Atualize a página (F5).', 'Se o erro se repetir, encaminhe ao suporte com um print.'], 1
FROM public.support_categories WHERE slug='erros';

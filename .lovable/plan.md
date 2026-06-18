# Sistema Universal de Gestão e Vendas — Pizzaria (Fase 1 completa)

Vou construir a estrutura completa de todos os módulos solicitados, com profundidade real nos fluxos principais (vendas/pedidos/PDV/mesas/caixa) e cardápio público funcional ponta-a-ponta. Estética inspirada em pizzaria artesanal (tons quentes, terracota/tomate, off-white, tipografia com personalidade).

## Stack & Backend

- TanStack Start + React 19 + Tailwind v4 (já configurado)
- **Lovable Cloud** (Supabase) para: autenticação admin, banco Postgres com RLS, realtime para pedidos chegando no admin
- shadcn/ui customizado via design system (tokens em `src/styles.css`)
- Fontes: Outfit (headings) + Inter (body) via @fontsource
- Paleta: terracota `#C2410C`, creme `#FBF7F0`, carvão `#1C1917`, oliva `#65A30D` (sucesso), âmbar (atenção)

## Modelagem do banco (resumo)

```
profiles (id→auth.users, nome, papel)
user_roles (id, user_id, role: admin|operador|caixa)  -- separado, com has_role()
categories (id, nome, ordem, ativo, icone)
products (id, category_id, nome, descricao, preco, preco_promo, imagem_url, ativo, disponivel)
customers (id, nome, telefone, endereco_json)
orders (id, numero, cliente_id?, origem: pdv|mesa|online, status, tipo: retirada|local|entrega,
        subtotal, desconto, taxa_entrega, total, forma_pgto, observacoes, mesa_id?, criado_em)
order_items (id, order_id, product_id, qtd, preco_unit, subtotal, observacoes)
tables (id, numero, capacidade, status: livre|ocupada|reservada)
cash_sessions (id, aberto_por, aberto_em, fechado_em, saldo_inicial, saldo_final, status)
cash_movements (id, session_id, tipo: entrada|saida|sangria|reforço|venda, valor, descricao, criado_em)
settings (singleton: nome_estabelecimento, horario, banner_url, taxa_entrega_padrao, etc.)
```

RLS: tabelas operacionais exigem usuário autenticado com role `admin`/`operador`/`caixa` (via `has_role`); `categories`/`products` legíveis publicamente (TO anon SELECT) para o cardápio; `orders` insert público (cliente final cria pedido sem login).

## Rotas

### Públicas (cliente final)
- `/` — cardápio público (banner, info loja, busca, filtro categoria, grid de produtos)
- `/produto/$id` — detalhe + adicionar ao carrinho
- `/carrinho` — itens, observações, totais
- `/checkout` — dados, tipo de pedido (retirada/local/entrega), forma de pgto
- `/pedido/$numero` — confirmação + acompanhamento

Carrinho persistido em `localStorage`.

### Admin (sob `_authenticated/`)
- `/auth` — login + recuperar senha + reset-password
- `/admin` — Dashboard (KPIs, gráficos Recharts)
- `/admin/vendas` — listagem com filtros (data, cliente, pgto, status, origem)
- `/admin/catalogo` — produtos + categorias (CRUD, upload imagem via storage)
- `/admin/pedidos` — kanban por status + realtime + impressão
- `/admin/pdv` — tela de venda balcão
- `/admin/mesas` — grid de mesas, abrir/fechar/dividir/transferir
- `/admin/caixa` — abertura, movimentos, fechamento, histórico
- `/admin/configuracoes` — dados do estabelecimento, horário, taxa entrega

## Design System

- Tokens semânticos em `src/styles.css` (oklch): `--primary` terracota, `--accent` âmbar, surfaces creme, gradientes quentes, sombras suaves
- Variants em Button (`hero`, `pdv`, `danger`), Card (`product`, `order-status`)
- Layout admin com sidebar shadcn (collapsible="icon") + header com SidebarTrigger
- Layout público sem sidebar, header limpo com nome/horário/carrinho

## Detalhes funcionais relevantes

- **Realtime**: admin/pedidos assina canal Postgres → novos pedidos chegam sem refresh, com toast + som opcional
- **Numeração de pedido**: sequência via função SQL `next_order_number()`
- **PDV**: busca instant, atalhos de teclado, múltiplas formas de pagamento (split)
- **Mesas**: cartões coloridos por status, modal de comanda, dividir conta por pessoa ou por item
- **Caixa**: bloqueia operações financeiras se não houver sessão aberta; toda venda finalizada cria movimento `entrada` na sessão ativa
- **Dashboard**: queries agregadas (hoje, mês, ticket médio, top 5 produtos, gráfico últimos 7 dias)
- **Impressão de pedido**: layout 80mm via `window.print` + CSS `@media print`

## Escopo "estrutural" (entregue funcional, mas mais enxuto)

- Recuperação de senha (fluxo Supabase padrão)
- Upload de imagens via Supabase Storage
- Configurações (form único)
- Dividir conta (split simples; split avançado por item entra como melhoria)

## Fora do escopo desta fase (preparado pra evoluir)

Estoque, fidelidade, cupons, cashback, QR mesa, multiempresa, WhatsApp, gateway de pagamento real, impressora térmica via API, mobile app. Schema e arquitetura já permitem adicionar sem refactor grande.

## Ordem de execução

1. Habilitar Lovable Cloud + migration completa (tabelas, RLS, roles, função numeração, seeds de categorias/produtos pizzaria)
2. Design system + layout admin/público + auth
3. Catálogo admin (produtos/categorias) + upload imagens
4. Catálogo público + carrinho + checkout + criação de pedido
5. Pedidos admin (kanban + realtime + impressão)
6. PDV
7. Mesas
8. Caixa + integração vendas→movimentos
9. Dashboard + Vendas (listagem/filtros) + Configurações
10. Seeds de demonstração (pizzas, bebidas, sobremesas)

Vou implementar tudo em sequência. É um volume grande de código — vai consumir bastante crédito. Confirma que posso seguir?
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/public/PublicLayout";
import { ProductImage } from "@/components/ProductImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { Plus, Search, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cardápio — Padaria Pão Dourado" },
      { name: "description", content: "Peça online pães, bolos, salgados, cafés e doces fresquinhos. Entrega e retirada rápida." },
      { property: "og:title", content: "Padaria Pão Dourado — Cardápio" },
      { property: "og:description", content: "Pães artesanais, bolos, doces e cafés fresquinhos todos os dias." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { add } = useCart();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
      return data;
    },
  });

  const categories = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["products", "public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("ativo", true)
        .eq("disponivel", true)
        .order("ordem");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = products.data ?? [];
    if (cat) list = list.filter((p) => p.category_id === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(s) || (p.descricao ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [products.data, cat, q]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const k = p.category_id ?? "outros";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [filtered]);

  return (
    <PublicLayout>
      <section className="bg-gradient-warm text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30">Padaria artesanal</Badge>
          <h1 className="font-display text-4xl font-bold md:text-6xl">
            {settings.data?.nome_estabelecimento ?? "Padaria Pão Dourado"}
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/90 md:text-lg">
            {settings.data?.descricao ?? "Pães artesanais, bolos, doces e cafés todos os dias."}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{settings.data?.horario_funcionamento}</span>
            {settings.data?.endereco && (
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{settings.data.endereco}</span>
            )}
          </div>
        </div>
      </section>

      <div className="sticky top-[57px] z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no cardápio..." className="pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCat(null)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${cat === null ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent/40"}`}
            >
              Tudo
            </button>
            {(categories.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent/40"}`}
              >
                <span className="mr-1">{c.icone}</span>
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {(categories.data ?? [])
          .filter((c) => !cat || c.id === cat)
          .map((c) => {
            const list = byCategory.get(c.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={c.id} className="mb-10">
                <h2 className="mb-4 font-display text-2xl font-bold">{c.icone} {c.nome}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => {
                    const preco = p.preco_promo ?? p.preco;
                    return (
                      <article key={p.id} className="group flex gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elevated">
                        <ProductImage src={p.imagem_url} alt={p.nome} className="h-24 w-24 shrink-0 rounded-lg" />
                        <div className="flex flex-1 flex-col">
                          <h3 className="font-semibold leading-tight">{p.nome}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
                          <div className="mt-auto flex items-end justify-between pt-2">
                            <div>
                              {p.preco_promo && (
                                <div className="text-xs text-muted-foreground line-through">{fmtMoney(p.preco)}</div>
                              )}
                              <div className="font-display text-lg font-bold text-primary">{fmtMoney(preco)}</div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                add({ product_id: p.id, nome: p.nome, preco: Number(preco), imagem_url: p.imagem_url ?? undefined });
                                toast.success(`${p.nome} adicionado`);
                              }}
                            >
                              <Plus className="h-4 w-4" /> Adicionar
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        {filtered.length === 0 && !products.isLoading && (
          <p className="py-20 text-center text-muted-foreground">Nenhum item encontrado.</p>
        )}
      </div>
    </PublicLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/format";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pdv")({
  component: PDVPage,
});

type CartLine = { product_id: string; nome: string; preco: number; quantidade: number };

function PDVPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [desc, setDesc] = useState(0);
  const [pgto, setPgto] = useState<"pix"|"dinheiro"|"credito"|"debito"|"vale">("dinheiro");
  const [clienteNome, setClienteNome] = useState("");
  const [checkout, setCheckout] = useState(false);

  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await supabase.from("categories").select("*").eq("ativo", true).order("ordem")).data ?? [] });
  const products = useQuery({ queryKey: ["admin-products-pdv"], queryFn: async () => (await supabase.from("products").select("*").eq("ativo", true).eq("disponivel", true).order("nome")).data ?? [] });

  const filtered = useMemo(() => {
    let list = products.data ?? [];
    if (cat) list = list.filter((p) => p.category_id === cat);
    if (q.trim()) list = list.filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [products.data, cat, q]);

  function add(p: any) {
    const preco = Number(p.preco_promo ?? p.preco);
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id);
      if (ex) return c.map((i) => i.product_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...c, { product_id: p.id, nome: p.nome, preco, quantidade: 1 }];
    });
  }
  const subtotal = cart.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const total = Math.max(0, subtotal - desc);

  const finalize = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Adicione itens");
      const { data: order, error } = await supabase.from("orders").insert({
        cliente_nome: clienteNome || "Balcão",
        origem: "pdv", tipo: "retirada", status: "finalizado",
        subtotal, desconto: desc, taxa_entrega: 0, total,
        forma_pagamento: pgto,
        finalizado_em: new Date().toISOString(),
      }).select("id, numero").single();
      if (error) throw error;
      await supabase.from("order_items").insert(cart.map((i) => ({
        order_id: order!.id, product_id: i.product_id, produto_nome: i.nome,
        quantidade: i.quantidade, preco_unitario: i.preco, subtotal: i.preco * i.quantidade,
      })));
      // registra entrada no caixa se houver sessão aberta
      const { data: session } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
      if (session) {
        await supabase.from("cash_movements").insert({
          session_id: session.id, tipo: "venda", valor: total,
          descricao: `Venda PDV #${order!.numero}`, forma_pagamento: pgto, order_id: order!.id,
        });
      }
      return order;
    },
    onSuccess: (order) => {
      toast.success(`Venda #${order!.numero} finalizada`);
      setCart([]); setDesc(0); setClienteNome(""); setCheckout(false);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-3 overflow-hidden">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Buscar produto..." autoFocus />
          </div>
          <Select value={cat ?? "all"} onValueChange={(v) => setCat(v === "all" ? null : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => add(p)} className="rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent/20">
              <div className="line-clamp-2 text-sm font-medium">{p.nome}</div>
              <div className="mt-1 font-display text-base font-bold text-primary">{fmtMoney(Number(p.preco_promo ?? p.preco))}</div>
            </button>
          ))}
        </div>
      </div>

      <Card className="flex flex-col p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4" /> Comanda</h2>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {cart.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Sem itens</div>}
          {cart.map((i) => (
            <div key={i.product_id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
              <div className="flex-1">
                <div className="font-medium leading-tight">{i.nome}</div>
                <div className="text-xs text-muted-foreground">{fmtMoney(i.preco)}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart((c) => c.map((x) => x.product_id === i.product_id ? { ...x, quantidade: Math.max(1, x.quantidade - 1) } : x))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center">{i.quantidade}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart((c) => c.map((x) => x.product_id === i.product_id ? { ...x, quantidade: x.quantidade + 1 } : x))}>
                <Plus className="h-3 w-3" />
              </Button>
              <div className="w-16 text-right font-semibold">{fmtMoney(i.preco * i.quantidade)}</div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart((c) => c.filter((x) => x.product_id !== i.product_id))}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
          <div className="flex items-center justify-between">
            <span>Desconto</span>
            <Input type="number" value={desc} onChange={(e) => setDesc(Number(e.target.value))} className="h-8 w-24 text-right" />
          </div>
          <div className="flex justify-between border-t pt-2 font-display text-xl font-bold"><span>Total</span><span className="text-primary">{fmtMoney(total)}</span></div>
        </div>
        <Button size="lg" className="mt-3" disabled={cart.length === 0} onClick={() => setCheckout(true)}>Finalizar</Button>
      </Card>

      {checkout && (
        <Dialog open onOpenChange={() => setCheckout(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Finalizar venda</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Cliente (opcional)</Label><Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Balcão" /></div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={pgto} onValueChange={(v) => setPgto(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="vale">Vale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center font-display text-2xl font-bold text-primary">{fmtMoney(total)}</div>
              <Button className="w-full" size="lg" onClick={() => finalize.mutate()} disabled={finalize.isPending}>
                {finalize.isPending ? "Processando..." : "Confirmar pagamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

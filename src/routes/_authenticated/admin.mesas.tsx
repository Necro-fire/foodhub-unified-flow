import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { Coffee, Plus, Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/mesas")({
  component: MesasPage,
});

function MesasPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const tables = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await supabase.from("restaurant_tables").select("*").order("numero")).data ?? [],
  });

  // pedidos abertos por mesa
  const openOrders = useQuery({
    queryKey: ["mesa-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, order_items(*)")
        .eq("origem", "mesa").not("status", "in", "(finalizado,cancelado)");
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("mesas").on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, () => qc.invalidateQueries({ queryKey: ["tables"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const addTable = useMutation({
    mutationFn: async () => {
      const max = Math.max(0, ...(tables.data ?? []).map((t) => t.numero));
      await supabase.from("restaurant_tables").insert({ numero: max + 1, capacidade: 4 });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Mesas</h1>
          <p className="text-sm text-muted-foreground">{(tables.data ?? []).length} mesa(s)</p>
        </div>
        <Button onClick={() => addTable.mutate()}><Plus className="h-4 w-4" />Adicionar mesa</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {(tables.data ?? []).map((m) => {
          const order = (openOrders.data ?? []).find((o) => o.mesa_id === m.id);
          const ocupada = m.status === "ocupada" || !!order;
          return (
            <button key={m.id} onClick={() => setSelected({ mesa: m, order })} className={`rounded-xl border-2 p-4 text-left transition ${ocupada ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
              <Coffee className={`mb-2 h-6 w-6 ${ocupada ? "text-primary" : "text-muted-foreground"}`} />
              <div className="font-display text-2xl font-bold">Mesa {m.numero}</div>
              <div className="text-xs text-muted-foreground">{m.capacidade} lugares</div>
              <div className={`mt-1 text-xs font-medium ${ocupada ? "text-primary" : "text-success"}`}>{ocupada ? "Ocupada" : "Livre"}</div>
              {order && <div className="mt-1 text-sm font-semibold">{fmtMoney(order.total)}</div>}
            </button>
          );
        })}
      </div>

      {selected && <MesaDialog mesa={selected.mesa} order={selected.order} tables={tables.data ?? []} onClose={() => { setSelected(null); qc.invalidateQueries(); }} />}
    </div>
  );
}

function MesaDialog({ mesa, order, tables, onClose }: any) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"comanda" | "add">(order ? "comanda" : "add");
  const [transferTo, setTransferTo] = useState<string>("");
  const products = useQuery({ queryKey: ["admin-products-pdv"], queryFn: async () => (await supabase.from("products").select("*").eq("ativo", true).eq("disponivel", true).order("nome")).data ?? [] });

  async function addItem(p: any) {
    let currentOrder = order;
    if (!currentOrder) {
      const { data } = await supabase.from("orders").insert({
        cliente_nome: `Mesa ${mesa.numero}`, origem: "mesa", tipo: "local", status: "em_preparo",
        mesa_id: mesa.id, subtotal: 0, total: 0,
      }).select().single();
      currentOrder = { ...data, order_items: [] };
      await supabase.from("restaurant_tables").update({ status: "ocupada" }).eq("id", mesa.id);
    }
    const preco = Number(p.preco_promo ?? p.preco);
    await supabase.from("order_items").insert({
      order_id: currentOrder.id, product_id: p.id, produto_nome: p.nome,
      quantidade: 1, preco_unitario: preco, subtotal: preco,
    });
    await recalcTotal(currentOrder.id);
    qc.invalidateQueries();
    toast.success("Adicionado");
  }

  async function recalcTotal(orderId: string) {
    const { data: items } = await supabase.from("order_items").select("subtotal").eq("order_id", orderId);
    const subtotal = (items ?? []).reduce((s, i) => s + Number(i.subtotal), 0);
    await supabase.from("orders").update({ subtotal, total: subtotal }).eq("id", orderId);
  }

  async function removeItem(itemId: string) {
    await supabase.from("order_items").delete().eq("id", itemId);
    if (order) await recalcTotal(order.id);
    qc.invalidateQueries();
  }

  async function closeBill(forma: string) {
    if (!order) return;
    await supabase.from("orders").update({ status: "finalizado", forma_pagamento: forma as any, finalizado_em: new Date().toISOString() }).eq("id", order.id);
    await supabase.from("restaurant_tables").update({ status: "livre" }).eq("id", mesa.id);
    const { data: session } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
    if (session) {
      await supabase.from("cash_movements").insert({ session_id: session.id, tipo: "venda", valor: order.total, descricao: `Mesa ${mesa.numero} #${order.numero}`, forma_pagamento: forma as any, order_id: order.id });
    }
    toast.success("Conta fechada");
    onClose();
  }

  async function transfer() {
    if (!order || !transferTo) return;
    await supabase.from("orders").update({ mesa_id: transferTo }).eq("id", order.id);
    await supabase.from("restaurant_tables").update({ status: "ocupada" }).eq("id", transferTo);
    // se nenhum outro pedido aberto na origem, libera
    const { data: rest } = await supabase.from("orders").select("id").eq("mesa_id", mesa.id).not("status", "in", "(finalizado,cancelado)");
    if ((rest ?? []).length === 0) await supabase.from("restaurant_tables").update({ status: "livre" }).eq("id", mesa.id);
    toast.success("Mesa transferida");
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Mesa {mesa.numero}</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "comanda" ? "default" : "outline"} onClick={() => setTab("comanda")}>Comanda</Button>
          <Button size="sm" variant={tab === "add" ? "default" : "outline"} onClick={() => setTab("add")}>Adicionar</Button>
        </div>

        {tab === "comanda" && (
          <div className="space-y-2">
            {!order && <p className="py-6 text-center text-sm text-muted-foreground">Sem itens. Abra a mesa adicionando produtos.</p>}
            {order && (
              <>
                <div className="space-y-1">
                  {(order.order_items ?? []).map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                      <span>{it.quantidade}× {it.produto_nome}</span>
                      <div className="flex items-center gap-2">
                        <span>{fmtMoney(it.subtotal)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(it.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2 font-display text-xl font-bold">
                  <span>Total</span><span className="text-primary">{fmtMoney(order.total)}</span>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  Dividir por pessoas: <strong className="text-foreground">{fmtMoney(order.total / 2)}</strong> (2x) ·
                  <strong className="text-foreground"> {fmtMoney(order.total / 3)}</strong> (3x) ·
                  <strong className="text-foreground"> {fmtMoney(order.total / 4)}</strong> (4x)
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Select value="" onValueChange={(v) => closeBill(v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Fechar conta com..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={transferTo} onValueChange={setTransferTo}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Transferir p/" /></SelectTrigger>
                    <SelectContent>
                      {tables.filter((t: any) => t.id !== mesa.id).map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>Mesa {t.numero}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={transfer} disabled={!transferTo}><ArrowRightLeft className="h-4 w-4" /></Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "add" && (
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(products.data ?? []).map((p) => (
                <button key={p.id} onClick={() => addItem(p)} className="rounded-lg border border-border bg-card p-2 text-left hover:border-primary">
                  <div className="line-clamp-2 text-xs font-medium">{p.nome}</div>
                  <div className="text-sm font-bold text-primary">{fmtMoney(Number(p.preco_promo ?? p.preco))}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

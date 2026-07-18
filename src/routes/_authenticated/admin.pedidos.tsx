import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fmtMoney, fmtTime, fmtDate, statusLabel, statusColor,
  paymentLabel, tipoLabel, tipoColor, tipoDot, origemLabel,
} from "@/lib/format";
import { Printer, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: PedidosPage,
});

const COLUMNS: Array<{ key: string; label: string; icon?: any; tone?: string }> = [
  { key: "novo", label: "Novos Pedidos" },
  { key: "em_preparo", label: "Em Produção" },
  { key: "pronto", label: "Prontos" },
  { key: "em_rota", label: "Em Rota de Entrega", icon: Truck, tone: "bg-chart-4/10 border-chart-4/40" },
  { key: "entregue", label: "Pedido Entregue" },
];

function PedidosPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<any | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [data, setData] = useState<string>("");

  const orders = useQuery({
    queryKey: ["admin-orders-active"],
    queryFn: async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .or(`status.in.(novo,confirmado,em_preparo,pronto,em_rota,saiu_entrega),and(status.eq.entregue,created_at.gte.${since.toISOString()})`)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("orders-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["admin-orders-active"] });
        if (payload.eventType === "INSERT") toast.success(`Novo pedido #${(payload.new as any).numero}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "entregue" || status === "finalizado") patch.finalizado_em = new Date().toISOString();
      await supabase.from("orders").update(patch).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const filtered = useMemo(() => {
    let list = orders.data ?? [];
    // map saiu_entrega/confirmado para em_preparo visual? mantemos cru.
    if (tipoFilter !== "todos") list = list.filter((o) => o.tipo === tipoFilter);
    if (data) list = list.filter((o) => (o.created_at as string).slice(0, 10) === data);
    if (busca.trim()) {
      const s = busca.toLowerCase();
      list = list.filter((o) =>
        String(o.numero).includes(s) ||
        (o.cliente_nome ?? "").toLowerCase().includes(s) ||
        (o.cliente_telefone ?? "").includes(s),
      );
    }
    return list;
  }, [orders.data, tipoFilter, busca, data]);

  const byStatus = (k: string) => {
    if (k === "em_preparo") return filtered.filter((o) => o.status === "em_preparo" || o.status === "confirmado");
    if (k === "pronto") return filtered.filter((o) => o.status === "pronto" || o.status === "saiu_entrega");
    return filtered.filter((o) => o.status === k);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe e atualize o status em tempo real.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input placeholder="Buscar nº/cliente/tel" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as categorias</SelectItem>
              <SelectItem value="local">Mesa</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
              <SelectItem value="retirada">Retirada</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <Button variant="outline" onClick={() => { setBusca(""); setTipoFilter("todos"); setData(""); }}>Limpar</Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary">{byStatus(col.key).length}</Badge>
            </div>
            <div className="flex min-h-[200px] flex-col gap-2 rounded-lg bg-muted/40 p-2">
              {byStatus(col.key).map((o) => (
                <Card
                  key={o.id}
                  className={`cursor-pointer p-3 border-l-4 hover:shadow-elevated ${tipoColor[o.tipo] ?? ""}`}
                  onClick={() => setDetail(o)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-bold">#{o.numero}</div>
                      <div className="text-xs text-muted-foreground">{fmtTime(o.created_at)} · {origemLabel[o.origem]}</div>
                    </div>
                    <div className="text-right text-sm font-semibold">{fmtMoney(o.total)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs">{o.cliente_nome ?? "Sem cliente"}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <span className={`h-2 w-2 rounded-full ${tipoDot[o.tipo] ?? "bg-muted"}`} />
                    <span className="font-medium">{tipoLabel[o.tipo]}</span>
                  </div>
                  {col.next && (
                    <Button size="sm" className="mt-2 w-full" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: o.id, status: col.next! }); }}>
                      Avançar →
                    </Button>
                  )}
                </Card>
              ))}
              {byStatus(col.key).length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">vazio</div>}
            </div>
          </div>
        ))}
      </div>

      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} onUpdate={(s: string) => updateStatus.mutate({ id: detail.id, status: s })} />}
    </div>
  );
}

function OrderDetail({ order, onClose, onUpdate }: any) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pedido #{order.numero}
            <Badge className={tipoColor[order.tipo]}>{tipoLabel[order.tipo]}</Badge>
            <Badge className={statusColor[order.status]}>{statusLabel[order.status]}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="print-area space-y-2 text-sm">
          <div className="text-center font-bold">PEDIDO #{order.numero}</div>
          <div>Categoria: {tipoLabel[order.tipo]}</div>
          <div>Cliente: {order.cliente_nome}</div>
          <div>Telefone: {order.cliente_telefone}</div>
          {order.tipo === "entrega" && (
            <>
              {order.cliente_endereco && <div>Endereço: {order.cliente_endereco}</div>}
              {order.bairro && <div>Bairro: {order.bairro}</div>}
            </>
          )}
          {order.tipo === "retirada" && order.horario_retirada && (
            <div>Retirada prevista: {fmtDate(order.horario_retirada)}</div>
          )}
          <div>Pagamento: {paymentLabel[order.forma_pagamento]}</div>
          <hr />
          {(order.order_items ?? []).map((it: any) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.quantidade}× {it.produto_nome}</span>
              <span>{fmtMoney(it.subtotal)}</span>
            </div>
          ))}
          <hr />
          <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(order.subtotal)}</span></div>
          {Number(order.taxa_entrega) > 0 && <div className="flex justify-between"><span>Taxa</span><span>{fmtMoney(order.taxa_entrega)}</span></div>}
          <div className="flex justify-between font-bold"><span>Total</span><span>{fmtMoney(order.total)}</span></div>
          {order.observacoes && <div className="border-t pt-2 italic">Obs: {order.observacoes}</div>}
        </div>
        <div className="no-print flex flex-wrap gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => onUpdate("cancelado")}>Cancelar</Button>
          <Button size="sm" onClick={() => { onUpdate("entregue"); onClose(); }}>Marcar entregue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

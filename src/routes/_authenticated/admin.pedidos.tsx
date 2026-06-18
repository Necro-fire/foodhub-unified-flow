import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney, fmtTime, statusLabel, statusColor, paymentLabel, tipoLabel, origemLabel } from "@/lib/format";
import { Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: PedidosPage,
});

const COLUMNS: Array<{ key: any; label: string; next?: string }> = [
  { key: "novo", label: "Novos", next: "confirmado" },
  { key: "confirmado", label: "Confirmados", next: "em_preparo" },
  { key: "em_preparo", label: "Em preparo", next: "pronto" },
  { key: "pronto", label: "Prontos", next: "saiu_entrega" },
  { key: "saiu_entrega", label: "Saiu p/ entrega", next: "finalizado" },
];

function PedidosPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<any | null>(null);

  const orders = useQuery({
    queryKey: ["admin-orders-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .in("status", ["novo","confirmado","em_preparo","pronto","saiu_entrega"])
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
      if (status === "finalizado") patch.finalizado_em = new Date().toISOString();
      await supabase.from("orders").update(patch).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const byStatus = (k: string) => (orders.data ?? []).filter((o) => o.status === k);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Acompanhe e atualize o status em tempo real.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary">{byStatus(col.key).length}</Badge>
            </div>
            <div className="flex min-h-[200px] flex-col gap-2 rounded-lg bg-muted/40 p-2">
              {byStatus(col.key).map((o) => (
                <Card key={o.id} className="cursor-pointer p-3 hover:shadow-elevated" onClick={() => setDetail(o)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-bold">#{o.numero}</div>
                      <div className="text-xs text-muted-foreground">{fmtTime(o.created_at)} · {origemLabel[o.origem]}</div>
                    </div>
                    <div className="text-right text-sm font-semibold">{fmtMoney(o.total)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs">{o.cliente_nome ?? "Sem cliente"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{tipoLabel[o.tipo]}</div>
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

      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} onUpdate={(s) => updateStatus.mutate({ id: detail.id, status: s })} />}
    </div>
  );
}

function OrderDetail({ order, onClose, onUpdate }: any) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pedido #{order.numero}</DialogTitle>
        </DialogHeader>
        <div className="print-area space-y-2 text-sm">
          <div className="text-center font-bold">PEDIDO #{order.numero}</div>
          <div>Cliente: {order.cliente_nome}</div>
          <div>Telefone: {order.cliente_telefone}</div>
          <div>Tipo: {tipoLabel[order.tipo]}</div>
          {order.cliente_endereco && <div>Endereço: {order.cliente_endereco}</div>}
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
          <Button size="sm" onClick={() => { onUpdate("finalizado"); onClose(); }}>Finalizar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

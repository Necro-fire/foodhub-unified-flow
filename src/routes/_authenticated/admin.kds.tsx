import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, tipoLabel } from "@/lib/format";
import { Clock, ChefHat, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/kds")({
  component: KDSPage,
});

const COLUMNS: { key: string; label: string; next?: string; icon: any; color: string }[] = [
  { key: "novo", label: "Recebido", next: "em_preparo", icon: Clock, color: "border-chart-4/60" },
  { key: "em_preparo", label: "Em Preparo", next: "pronto", icon: ChefHat, color: "border-warning/60" },
  { key: "pronto", label: "Pronto", next: "finalizado", icon: CheckCircle2, color: "border-success/60" },
];

function KDSPage() {
  const qc = useQueryClient();

  const orders = useQuery({
    queryKey: ["kds-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*), restaurant_tables(numero)")
        .in("status", ["novo", "em_preparo", "pronto"])
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("kds")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        qc.invalidateQueries({ queryKey: ["kds-orders"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () =>
        qc.invalidateQueries({ queryKey: ["kds-orders"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const byStatus = useMemo(() => {
    const m: Record<string, any[]> = { novo: [], em_preparo: [], pronto: [] };
    for (const o of orders.data ?? []) (m[o.status] ??= []).push(o);
    return m;
  }, [orders.data]);

  async function advance(order: any, next?: string) {
    if (!next) return;
    const patch: any = { status: next };
    if (next === "finalizado") patch.finalizado_em = new Date().toISOString();
    await supabase.from("orders").update(patch).eq("id", order.id);
    toast.success(`Pedido #${order.numero} → ${next.replace("_", " ")}`);
    qc.invalidateQueries({ queryKey: ["kds-orders"] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">KDS — Cozinha</h1>
        <p className="text-sm text-muted-foreground">Fluxo em tempo real dos pedidos em produção.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = byStatus[col.key] ?? [];
          const Icon = col.icon;
          return (
            <div key={col.key} className={`flex flex-col rounded-xl border-2 ${col.color} bg-card/40`}>
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <h2 className="font-semibold">{col.label}</h2>
                </div>
                <Badge variant="secondary">{list.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 p-2 min-h-32">
                {list.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">Sem pedidos</p>
                )}
                {list.map((o) => {
                  const minutos = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
                  const urgente = minutos >= 15;
                  return (
                    <article key={o.id} className={`rounded-lg border p-3 ${urgente ? "border-destructive/60 bg-destructive/5" : "border-border bg-background"}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-display text-lg font-bold">#{o.numero}</div>
                        <span className={`text-xs font-medium ${urgente ? "text-destructive" : "text-muted-foreground"}`}>
                          {minutos}min
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {tipoLabel[o.tipo] ?? o.tipo}
                        {o.restaurant_tables?.numero && ` · Mesa ${o.restaurant_tables.numero}`}
                        {o.cliente_nome && ` · ${o.cliente_nome}`}
                      </div>
                      <ul className="mt-2 space-y-0.5 text-sm">
                        {(o.order_items ?? []).map((it: any) => (
                          <li key={it.id} className="flex gap-2">
                            <span className="font-semibold text-primary">{it.quantidade}×</span>
                            <span>{it.produto_nome}</span>
                          </li>
                        ))}
                      </ul>
                      {o.observacoes && (
                        <p className="mt-2 rounded bg-warning/10 px-2 py-1 text-xs text-warning-foreground">
                          ⚠ {o.observacoes}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">{fmtMoney(o.total)}</span>
                        {col.next && (
                          <Button size="sm" onClick={() => advance(o, col.next)}>
                            {col.next === "finalizado" ? "Entregar" : col.next === "pronto" ? "Marcar pronto" : "Iniciar"}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/public/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { fmtMoney, statusLabel, statusColor, tipoLabel, paymentLabel } from "@/lib/format";

export const Route = createFileRoute("/pedido/$numero")({
  head: ({ params }) => ({ meta: [{ title: `Pedido #${params.numero} — Padaria` }] }),
  component: OrderPage,
});

function OrderPage() {
  const { numero } = Route.useParams();

  const order = useQuery({
    queryKey: ["order", numero],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("numero", Number(numero))
        .maybeSingle();
      return data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`order-${numero}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => order.refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [numero, order]);

  if (order.isLoading) return <PublicLayout><div className="py-20 text-center">Carregando...</div></PublicLayout>;
  if (!order.data) return <PublicLayout><div className="py-20 text-center">Pedido não encontrado.</div></PublicLayout>;

  const o = order.data;
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
          <h1 className="font-display text-2xl font-bold">Pedido recebido!</h1>
          <p className="mt-1 text-muted-foreground">Número do pedido</p>
          <div className="my-2 font-display text-4xl font-bold text-primary">#{o.numero}</div>
          <Badge className={statusColor[o.status]}>{statusLabel[o.status]}</Badge>
        </div>

        <div className="mt-6 space-y-2 rounded-xl border border-border bg-card p-5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span>{o.cliente_nome}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span>{o.cliente_telefone}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{tipoLabel[o.tipo]}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span>{o.forma_pagamento ? paymentLabel[o.forma_pagamento] : "—"}</span></div>
          {o.cliente_endereco && <div className="border-t pt-2 text-muted-foreground">Endereço: {o.cliente_endereco}</div>}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold">Itens</h2>
          <div className="space-y-2">
            {(o.order_items ?? []).map((it: any) => (
              <div key={it.id} className="flex justify-between text-sm">
                <span>{it.quantidade}× {it.produto_nome}</span>
                <span>{fmtMoney(it.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(o.subtotal)}</span></div>
            {Number(o.taxa_entrega) > 0 && <div className="flex justify-between"><span>Taxa entrega</span><span>{fmtMoney(o.taxa_entrega)}</span></div>}
            <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">{fmtMoney(o.total)}</span></div>
          </div>
        </div>

        <Button asChild className="mt-6 w-full" variant="outline"><Link to="/">Fazer novo pedido</Link></Button>
      </div>
    </PublicLayout>
  );
}

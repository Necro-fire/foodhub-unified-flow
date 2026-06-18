import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtMoney } from "@/lib/format";
import { TrendingUp, ShoppingBag, Clock, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0,0,0,0);

      const [todayOrders, monthOrders, pendingOrders, last7, topItems] = await Promise.all([
        supabase.from("orders").select("total, id").gte("created_at", today.toISOString()).neq("status", "cancelado"),
        supabase.from("orders").select("total").gte("created_at", monthStart.toISOString()).neq("status", "cancelado"),
        supabase.from("orders").select("id, status").in("status", ["novo","confirmado","em_preparo","pronto","saiu_entrega"]),
        supabase.from("orders").select("total, created_at").gte("created_at", sevenDaysAgo.toISOString()).neq("status","cancelado"),
        supabase.from("order_items").select("produto_nome, quantidade").limit(1000),
      ]);

      const totalHoje = (todayOrders.data ?? []).reduce((s, o) => s + Number(o.total), 0);
      const pedidosHoje = (todayOrders.data ?? []).length;
      const totalMes = (monthOrders.data ?? []).reduce((s, o) => s + Number(o.total), 0);
      const ticketMedio = pedidosHoje > 0 ? totalHoje / pedidosHoje : 0;

      // gráfico últimos 7 dias
      const byDay = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo); d.setDate(d.getDate() + i);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      for (const o of last7.data ?? []) {
        const k = o.created_at.slice(0, 10);
        byDay.set(k, (byDay.get(k) ?? 0) + Number(o.total));
      }
      const chart7 = Array.from(byDay.entries()).map(([d, v]) => ({
        dia: new Date(d).toLocaleDateString("pt-BR", { weekday: "short" }),
        total: Number(v.toFixed(2)),
      }));

      // top produtos
      const counts = new Map<string, number>();
      for (const it of topItems.data ?? []) counts.set(it.produto_nome, (counts.get(it.produto_nome) ?? 0) + it.quantidade);
      const top5 = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([nome, qty]) => ({ nome, qty }));

      return { totalHoje, pedidosHoje, totalMes, ticketMedio, pendentes: (pendingOrders.data ?? []).length, chart7, top5 };
    },
    refetchInterval: 30000,
  });

  const s = stats.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Resumo da operação em tempo real.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={DollarSign} label="Vendas hoje" value={fmtMoney(s?.totalHoje ?? 0)} hint={`${s?.pedidosHoje ?? 0} pedidos`} />
        <KpiCard icon={TrendingUp} label="Vendas no mês" value={fmtMoney(s?.totalMes ?? 0)} />
        <KpiCard icon={ShoppingBag} label="Ticket médio" value={fmtMoney(s?.ticketMedio ?? 0)} />
        <KpiCard icon={Clock} label="Em andamento" value={String(s?.pendentes ?? 0)} hint="pedidos abertos" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Vendas — últimos 7 dias</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s?.chart7 ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="dia" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Top 5 produtos</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s?.top5 ?? []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" width={100} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip />
                <Bar dataKey="qty" fill="var(--color-accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

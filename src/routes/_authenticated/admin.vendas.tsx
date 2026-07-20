import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtDate, statusLabel, statusColor, paymentLabel, origemLabel, tipoLabel, tipoColor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/vendas")({
  component: VendasPage,
});

function VendasPage() {
  const [status, setStatus] = useState<string>("todos");
  const [origem, setOrigem] = useState<string>("todos");
  const [pgto, setPgto] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [data, setData] = useState<string>("");
  const [busca, setBusca] = useState("");

  const list = useQuery({
    queryKey: ["vendas", status, origem, pgto, tipo, data],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
      if (status !== "todos") q = q.eq("status", status as any);
      if (origem !== "todos") q = q.eq("origem", origem as any);
      if (pgto !== "todos") q = q.eq("forma_pagamento", pgto as any);
      if (tipo !== "todos") q = q.eq("tipo", tipo as any);
      if (data) {
        const start = `${data}T00:00:00.000Z`;
        const end = `${data}T23:59:59.999Z`;
        q = q.gte("created_at", start).lte("created_at", end);
      }
      const { data: rows } = await q;
      return rows ?? [];
    },
  });

  const filtered = (list.data ?? []).filter((o) => {
    if (!busca.trim()) return true;
    const s = busca.toLowerCase();
    return String(o.numero).includes(s) || (o.cliente_nome ?? "").toLowerCase().includes(s) || (o.cliente_telefone ?? "").includes(s);
  });

  const total = filtered.reduce((s, o) => s + Number(o.total), 0);


  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} venda(s) — total {fmtMoney(total)}</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input placeholder="Buscar nº/cliente/tel" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas categorias</SelectItem>
              <SelectItem value="local">Mesa</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
              <SelectItem value="retirada">Retirada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as origens</SelectItem>
              {Object.entries(origemLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pgto} onValueChange={setPgto}>
            <SelectTrigger><SelectValue placeholder="Pagamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos pagamentos</SelectItem>
              {Object.entries(paymentLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Pgto</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-accent/20">
                  <td className="px-3 py-2 font-mono font-semibold">#{o.numero}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDate(o.created_at)}</td>
                  <td className="px-3 py-2">{o.cliente_nome ?? "—"}</td>
                  <td className="px-3 py-2"><Badge className={tipoColor[o.tipo]}>{tipoLabel[o.tipo]}</Badge></td>
                  <td className="px-3 py-2">{origemLabel[o.origem]}</td>
                  <td className="px-3 py-2">{o.forma_pagamento ? paymentLabel[o.forma_pagamento] : "—"}</td>
                  <td className="px-3 py-2"><Badge className={statusColor[o.status]}>{statusLabel[o.status]}</Badge></td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(o.total)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma venda encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

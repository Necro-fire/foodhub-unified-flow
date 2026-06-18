import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, fmtDate, paymentLabel } from "@/lib/format";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/caixa")({
  component: CaixaPage,
});

function CaixaPage() {
  const qc = useQueryClient();
  const [openDlg, setOpenDlg] = useState<"open" | "close" | "mov" | null>(null);
  const [movType, setMovType] = useState<"entrada"|"saida"|"sangria"|"reforco">("entrada");

  const session = useQuery({
    queryKey: ["cash-session"],
    queryFn: async () => {
      const { data } = await supabase.from("cash_sessions").select("*").eq("status", "aberta").maybeSingle();
      return data;
    },
  });

  const movements = useQuery({
    queryKey: ["cash-movements", session.data?.id],
    enabled: !!session.data?.id,
    queryFn: async () => (await supabase.from("cash_movements").select("*").eq("session_id", session.data!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const history = useQuery({
    queryKey: ["cash-sessions-history"],
    queryFn: async () => (await supabase.from("cash_sessions").select("*").eq("status", "fechada").order("fechado_em", { ascending: false }).limit(10)).data ?? [],
  });

  const totals = (movements.data ?? []).reduce((acc, m) => {
    const v = Number(m.valor);
    if (m.tipo === "venda" || m.tipo === "entrada" || m.tipo === "reforco") acc.entradas += v;
    else acc.saidas += v;
    return acc;
  }, { entradas: 0, saidas: 0 });

  const saldoAtual = session.data ? Number(session.data.saldo_inicial) + totals.entradas - totals.saidas : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Caixa</h1>
          <p className="text-sm text-muted-foreground">{session.data ? "Sessão aberta" : "Nenhuma sessão aberta"}</p>
        </div>
        {!session.data ? (
          <Button onClick={() => setOpenDlg("open")}><Unlock className="h-4 w-4" />Abrir caixa</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setMovType("entrada"); setOpenDlg("mov"); }}><ArrowDownCircle className="h-4 w-4" />Entrada</Button>
            <Button variant="outline" onClick={() => { setMovType("saida"); setOpenDlg("mov"); }}><ArrowUpCircle className="h-4 w-4" />Saída</Button>
            <Button variant="outline" onClick={() => { setMovType("sangria"); setOpenDlg("mov"); }}>Sangria</Button>
            <Button variant="outline" onClick={() => { setMovType("reforco"); setOpenDlg("mov"); }}>Reforço</Button>
            <Button variant="destructive" onClick={() => setOpenDlg("close")}><Lock className="h-4 w-4" />Fechar caixa</Button>
          </div>
        )}
      </div>

      {session.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <KCard label="Saldo inicial" value={fmtMoney(Number(session.data.saldo_inicial))} />
            <KCard label="Entradas" value={fmtMoney(totals.entradas)} color="text-success" />
            <KCard label="Saídas" value={fmtMoney(totals.saidas)} color="text-destructive" />
            <KCard label="Saldo atual" value={fmtMoney(saldoAtual)} highlight />
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-border p-3 font-semibold">Movimentações</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2">Pagto</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(movements.data ?? []).map((m) => {
                    const isIn = m.tipo === "venda" || m.tipo === "entrada" || m.tipo === "reforco";
                    return (
                      <tr key={m.id}>
                        <td className="px-3 py-2 text-muted-foreground">{fmtDate(m.created_at)}</td>
                        <td className="px-3 py-2 capitalize">{m.tipo}</td>
                        <td className="px-3 py-2">{m.descricao ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.forma_pagamento ? paymentLabel[m.forma_pagamento] : "—"}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${isIn ? "text-success" : "text-destructive"}`}>
                          {isIn ? "+" : "-"} {fmtMoney(Number(m.valor))}
                        </td>
                      </tr>
                    );
                  })}
                  {(movements.data ?? []).length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sem movimentações</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Histórico de fechamentos</h2>
        <div className="space-y-2 text-sm">
          {(history.data ?? []).map((s) => (
            <div key={s.id} className="flex justify-between rounded border border-border p-2">
              <div>
                <div className="font-medium">Aberto: {fmtDate(s.aberto_em)}</div>
                <div className="text-xs text-muted-foreground">Fechado: {s.fechado_em ? fmtDate(s.fechado_em) : "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Saldo final</div>
                <div className="font-semibold">{fmtMoney(Number(s.saldo_final ?? 0))}</div>
              </div>
            </div>
          ))}
          {(history.data ?? []).length === 0 && <p className="text-center text-xs text-muted-foreground">Sem histórico</p>}
        </div>
      </Card>

      {openDlg === "open" && <OpenDialog onClose={() => { setOpenDlg(null); qc.invalidateQueries(); }} />}
      {openDlg === "close" && session.data && <CloseDialog session={session.data} saldoEsperado={saldoAtual} onClose={() => { setOpenDlg(null); qc.invalidateQueries(); }} />}
      {openDlg === "mov" && session.data && <MovDialog tipo={movType} sessionId={session.data.id} onClose={() => { setOpenDlg(null); qc.invalidateQueries(); }} />}
    </div>
  );
}

function KCard({ label, value, color, highlight }: any) {
  return (
    <Card className={`p-4 ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold ${color ?? ""}`}>{value}</div>
    </Card>
  );
}

function OpenDialog({ onClose }: any) {
  const [saldo, setSaldo] = useState(0);
  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("cash_sessions").insert({ saldo_inicial: saldo, aberto_por: u.user?.id });
    },
    onSuccess: () => { toast.success("Caixa aberto"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Abrir caixa</DialogTitle></DialogHeader>
        <div><Label>Saldo inicial (R$)</Label><Input type="number" step="0.01" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))} autoFocus /></div>
        <DialogFooter><Button onClick={() => m.mutate()}>Abrir</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ session, saldoEsperado, onClose }: any) {
  const [contado, setContado] = useState(saldoEsperado);
  const [obs, setObs] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("cash_sessions").update({
        status: "fechada", saldo_final: contado, saldo_esperado: saldoEsperado,
        observacoes: obs, fechado_em: new Date().toISOString(), fechado_por: u.user?.id,
      }).eq("id", session.id);
    },
    onSuccess: () => { toast.success("Caixa fechado"); onClose(); },
  });
  const diff = contado - saldoEsperado;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Fechar caixa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded bg-muted p-3 text-sm">
            Saldo esperado: <strong>{fmtMoney(saldoEsperado)}</strong>
          </div>
          <div><Label>Saldo contado (R$)</Label><Input type="number" step="0.01" value={contado} onChange={(e) => setContado(Number(e.target.value))} /></div>
          {diff !== 0 && <div className={`text-sm ${diff > 0 ? "text-success" : "text-destructive"}`}>Diferença: {fmtMoney(diff)}</div>}
          <div><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="destructive" onClick={() => m.mutate()}>Confirmar fechamento</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovDialog({ tipo, sessionId, onClose }: any) {
  const [valor, setValor] = useState(0);
  const [desc, setDesc] = useState("");
  const [forma, setForma] = useState<string>("dinheiro");
  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("cash_movements").insert({ session_id: sessionId, tipo, valor, descricao: desc, forma_pagamento: forma as any, criado_por: u.user?.id });
    },
    onSuccess: () => { toast.success("Lançado"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="capitalize">{tipo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} autoFocus /></div>
          <div><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div>
            <Label>Forma</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={() => m.mutate()}>Confirmar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

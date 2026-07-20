import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Coffee, Plus, Trash2, ArrowRightLeft, QrCode, CalendarClock, Link2, History, UserCog, Map as MapIcon, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/_authenticated/admin/mesas")({
  component: MesasPage,
});

function tempoOcupacao(desde?: string | null) {
  if (!desde) return null;
  const ms = Date.now() - new Date(desde).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60); const r = min % 60;
  return `${h}h${r.toString().padStart(2, "0")}`;
}

function statusInfo(mesa: any, ocupada: boolean) {
  if (mesa.status === "reservada") return { label: "Reservada", cls: "border-warning bg-warning/10 text-warning-foreground" };
  if (mesa.mesa_pai_id) return { label: "Unida", cls: "border-chart-4 bg-chart-4/10 text-chart-4" };
  if (ocupada) return { label: "Ocupada", cls: "border-primary bg-primary/10 text-primary" };
  return { label: "Livre", cls: "border-success/40 bg-success/5 text-success" };
}

function MesasPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [qrMesa, setQrMesa] = useState<any | null>(null);
  const [reserva, setReserva] = useState<any | null>(null);
  const [view, setView] = useState<"grid" | "mapa">("grid");
  const [, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  const tables = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await supabase.from("restaurant_tables").select("*").order("numero")).data ?? [],
  });

  const openOrders = useQuery({
    queryKey: ["mesa-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, order_items(*)")
        .eq("origem", "mesa").not("status", "in", "(finalizado,cancelado)");
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("mesas")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, () => qc.invalidateQueries({ queryKey: ["tables"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["mesa-orders"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const addTable = useMutation({
    mutationFn: async () => {
      const max = Math.max(0, ...(tables.data ?? []).map((t) => t.numero));
      await supabase.from("restaurant_tables").insert({ numero: max + 1, capacidade: 4 });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const orderByMesa = useMemo(() => {
    const m: Record<string, any> = {};
    (openOrders.data ?? []).forEach((o) => { if (o.mesa_id) m[o.mesa_id] = o; });
    return m;
  }, [openOrders.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Mesas</h1>
          <p className="text-sm text-muted-foreground">{(tables.data ?? []).length} mesa(s) — atualização em tempo real</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <button onClick={() => setView("grid")} className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${view === "grid" ? "bg-primary text-primary-foreground" : ""}`}><LayoutGrid className="h-3.5 w-3.5" /> Grade</button>
            <button onClick={() => setView("mapa")} className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${view === "mapa" ? "bg-primary text-primary-foreground" : ""}`}><MapIcon className="h-3.5 w-3.5" /> Mapa</button>
          </div>
          <Button onClick={() => addTable.mutate()}><Plus className="h-4 w-4" />Adicionar mesa</Button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(tables.data ?? []).map((m) => {
            const order = orderByMesa[m.id];
            const ocupada = m.status === "ocupada" || !!order;
            const info = statusInfo(m, ocupada);
            const tempo = tempoOcupacao(m.ocupada_em ?? order?.created_at);
            return (
              <div key={m.id} className={`relative rounded-xl border-2 p-4 text-left transition ${info.cls}`}>
                <div className="absolute right-2 top-2 flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setReserva(m); }} title="Reservar" className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"><CalendarClock className="h-4 w-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setQrMesa(m); }} title="QR Code" className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"><QrCode className="h-4 w-4" /></button>
                </div>
                <button type="button" onClick={() => setSelected({ mesa: m, order })} className="block w-full text-left">
                  <Coffee className="mb-2 h-6 w-6" />
                  <div className="font-display text-2xl font-bold">Mesa {m.numero}</div>
                  <div className="text-xs text-muted-foreground">{m.capacidade} lugares</div>
                  <div className="mt-1 text-xs font-medium">{info.label}</div>
                  {tempo && ocupada && <div className="mt-0.5 text-xs opacity-70">⏱ {tempo}</div>}
                  {m.reserva_nome && m.status === "reservada" && <div className="mt-0.5 truncate text-xs">👤 {m.reserva_nome}</div>}
                  {order && <div className="mt-1 text-sm font-semibold">{fmtMoney(order.total)}</div>}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <MapaView tables={tables.data ?? []} orderByMesa={orderByMesa} onOpen={(m: any) => setSelected({ mesa: m, order: orderByMesa[m.id] })} onQr={setQrMesa} onReserva={setReserva} />
      )}

      {qrMesa && <QrDialog mesa={qrMesa} onClose={() => setQrMesa(null)} />}
      {reserva && <ReservaDialog mesa={reserva} onClose={() => { setReserva(null); qc.invalidateQueries(); }} />}
      {selected && <MesaDialog mesa={selected.mesa} order={selected.order} tables={tables.data ?? []} onClose={() => { setSelected(null); qc.invalidateQueries(); }} />}
    </div>
  );
}

function MapaView({ tables, orderByMesa, onOpen, onQr, onReserva }: any) {
  const qc = useQueryClient();
  async function moveTable(id: string, x: number, y: number) {
    await supabase.from("restaurant_tables").update({ pos_x: x, pos_y: y }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tables"] });
  }
  function onDragEnd(e: React.DragEvent, id: string) {
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.round(e.clientX - rect.left - 50));
    const y = Math.max(0, Math.round(e.clientY - rect.top - 50));
    moveTable(id, x, y);
  }
  return (
    <div className="relative min-h-[500px] w-full overflow-auto rounded-lg border-2 border-dashed border-border bg-muted/20 p-4">
      <p className="mb-2 text-xs text-muted-foreground">Arraste as mesas para posicionar no mapa. Clique para abrir a comanda.</p>
      <div className="relative min-h-[500px] w-full">
        {tables.map((m: any, idx: number) => {
          const order = orderByMesa[m.id];
          const ocupada = m.status === "ocupada" || !!order;
          const info = statusInfo(m, ocupada);
          const px = m.pos_x || ((idx % 6) * 110);
          const py = m.pos_y || (Math.floor(idx / 6) * 110);
          return (
            <div
              key={m.id}
              draggable
              onDragEnd={(e) => onDragEnd(e, m.id)}
              className={`absolute flex h-24 w-24 cursor-move flex-col items-center justify-center rounded-lg border-2 text-center shadow ${info.cls}`}
              style={{ left: px, top: py }}
            >
              <div className="absolute -right-1 -top-1 flex gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); onReserva(m); }} className="rounded bg-background p-0.5 shadow"><CalendarClock className="h-3 w-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); onQr(m); }} className="rounded bg-background p-0.5 shadow"><QrCode className="h-3 w-3" /></button>
              </div>
              <button onClick={() => onOpen(m)} className="flex h-full w-full flex-col items-center justify-center">
                <div className="font-display text-lg font-bold">M{m.numero}</div>
                <div className="text-[10px]">{info.label}</div>
                {order && <div className="text-[10px] font-semibold">{fmtMoney(order.total)}</div>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QrDialog({ mesa, onClose }: any) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/mesa/${mesa.numero}` : "";
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code — Mesa {mesa.numero}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg bg-white p-4"><QRCodeSVG value={url} size={220} /></div>
          <p className="text-center text-xs text-muted-foreground break-all">{url}</p>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}>Copiar link</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Imprimir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReservaDialog({ mesa, onClose }: any) {
  const [nome, setNome] = useState(mesa.reserva_nome ?? "");
  const [tel, setTel] = useState(mesa.reserva_telefone ?? "");
  const [hora, setHora] = useState(mesa.reserva_horario ? new Date(mesa.reserva_horario).toISOString().slice(0, 16) : "");
  async function salvar() {
    if (!nome || !hora) { toast.error("Nome e horário obrigatórios"); return; }
    await supabase.from("restaurant_tables").update({ status: "reservada", reserva_nome: nome, reserva_telefone: tel || null, reserva_horario: new Date(hora).toISOString() }).eq("id", mesa.id);
    await supabase.from("table_history").insert({ mesa_id: mesa.id, action: "reserva_criada", details: { nome, telefone: tel, horario: hora } });
    toast.success("Reserva criada"); onClose();
  }
  async function cancelar() {
    await supabase.from("restaurant_tables").update({ status: "livre", reserva_nome: null, reserva_telefone: null, reserva_horario: null }).eq("id", mesa.id);
    await supabase.from("table_history").insert({ mesa_id: mesa.id, action: "reserva_cancelada", details: {} });
    toast.success("Reserva cancelada"); onClose();
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Reservar Mesa {mesa.numero}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} /></div>
          <div><Label>Horário *</Label><Input type="datetime-local" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
          <div className="flex gap-2 pt-2">
            {mesa.status === "reservada" && <Button variant="outline" size="sm" onClick={cancelar}>Cancelar reserva</Button>}
            <div className="flex-1" />
            <Button size="sm" onClick={salvar}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MesaDialog({ mesa, order, tables, onClose }: any) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>(order ? "comanda" : "add");
  const [transferTo, setTransferTo] = useState<string>("");
  const [joinTo, setJoinTo] = useState<string>("");
  const [garcom, setGarcom] = useState<string>(mesa.garcom_id ?? "");
  const products = useQuery({ queryKey: ["admin-products-pdv"], queryFn: async () => (await supabase.from("products").select("*").eq("ativo", true).eq("disponivel", true).order("nome")).data ?? [] });
  const staff = useQuery({ queryKey: ["staff-list"], queryFn: async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["garcom", "admin", "operador", "proprietario", "gerente"]);
    if (!roles?.length) return [];
    const ids = [...new Set(roles.map((r) => r.user_id))];
    const { data: profs } = await supabase.from("profiles").select("id, nome, email").in("id", ids);
    return profs ?? [];
  }});
  const history = useQuery({ queryKey: ["mesa-history", mesa.id], queryFn: async () => (await supabase.from("table_history").select("*").eq("mesa_id", mesa.id).order("created_at", { ascending: false }).limit(30)).data ?? [] });

  async function addItem(p: any) {
    let currentOrder = order;
    if (!currentOrder) {
      const { data } = await supabase.from("orders").insert({
        cliente_nome: `Mesa ${mesa.numero}`, origem: "mesa", tipo: "local", status: "em_preparo",
        mesa_id: mesa.id, subtotal: 0, total: 0, garcom_id: garcom || null,
      }).select().single();
      currentOrder = { ...data, order_items: [] };
      await supabase.from("restaurant_tables").update({ status: "ocupada", ocupada_em: new Date().toISOString() }).eq("id", mesa.id);
      await supabase.from("table_history").insert({ mesa_id: mesa.id, action: "aberta", details: { garcom_id: garcom || null } });
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
    await supabase.from("restaurant_tables").update({ status: "livre", ocupada_em: null, garcom_id: null }).eq("id", mesa.id);
    await supabase.from("table_history").insert({ mesa_id: mesa.id, action: "fechada", details: { forma, total: order.total } });
    const { data: session } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
    if (session) {
      await supabase.from("cash_movements").insert({ session_id: session.id, tipo: "venda", valor: order.total, descricao: `Mesa ${mesa.numero} #${order.numero}`, forma_pagamento: forma as any, order_id: order.id });
    }
    toast.success("Conta fechada"); onClose();
  }

  async function transfer() {
    if (!order || !transferTo) return;
    await supabase.from("orders").update({ mesa_id: transferTo }).eq("id", order.id);
    await supabase.from("restaurant_tables").update({ status: "ocupada", ocupada_em: new Date().toISOString() }).eq("id", transferTo);
    const { data: rest } = await supabase.from("orders").select("id").eq("mesa_id", mesa.id).not("status", "in", "(finalizado,cancelado)");
    if ((rest ?? []).length === 0) await supabase.from("restaurant_tables").update({ status: "livre", ocupada_em: null }).eq("id", mesa.id);
    await supabase.from("table_history").insert({ mesa_id: mesa.id, action: "transferida", details: { para: transferTo } });
    toast.success("Mesa transferida"); onClose();
  }

  async function juntar() {
    if (!joinTo) return;
    await supabase.from("restaurant_tables").update({ mesa_pai_id: mesa.id }).eq("id", joinTo);
    await supabase.from("table_history").insert({ mesa_id: mesa.id, action: "juntada", details: { com: joinTo } });
    toast.success("Mesas unidas"); onClose();
  }

  async function desunir() {
    await supabase.from("restaurant_tables").update({ mesa_pai_id: null }).eq("mesa_pai_id", mesa.id);
    toast.success("Mesas separadas"); onClose();
  }

  async function trocarGarcom(userId: string) {
    setGarcom(userId);
    await supabase.from("restaurant_tables").update({ garcom_id: userId || null }).eq("id", mesa.id);
    if (order) await supabase.from("orders").update({ garcom_id: userId || null }).eq("id", order.id);
    await supabase.from("table_history").insert({ mesa_id: mesa.id, action: "garcom_trocado", details: { garcom_id: userId } });
    toast.success("Garçom atualizado");
  }

  const tempo = tempoOcupacao(mesa.ocupada_em ?? order?.created_at);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Mesa {mesa.numero}
            {tempo && <span className="text-xs font-normal text-muted-foreground">⏱ {tempo}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs">
          <UserCog className="h-4 w-4" />
          <span>Garçom:</span>
          <Select value={garcom} onValueChange={trocarGarcom}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Sem garçom" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem garçom</SelectItem>
              {(staff.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome ?? s.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="comanda" className="flex-1">Comanda</TabsTrigger>
            <TabsTrigger value="add" className="flex-1">Adicionar</TabsTrigger>
            <TabsTrigger value="acoes" className="flex-1">Ações</TabsTrigger>
            <TabsTrigger value="hist" className="flex-1"><History className="mr-1 h-3.5 w-3.5" />Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="comanda" className="space-y-2">
            {!order && <p className="py-6 text-center text-sm text-muted-foreground">Sem itens. Adicione produtos na aba "Adicionar".</p>}
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
                  Dividir: <strong className="text-foreground">{fmtMoney(order.total / 2)}</strong> (2x) ·
                  <strong className="text-foreground"> {fmtMoney(order.total / 3)}</strong> (3x) ·
                  <strong className="text-foreground"> {fmtMoney(order.total / 4)}</strong> (4x)
                </div>
                <div className="pt-2">
                  <Select value="" onValueChange={(v) => closeBill(v)}>
                    <SelectTrigger><SelectValue placeholder="Fechar conta com..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="multiplo">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="add" className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(products.data ?? []).map((p) => (
                <button key={p.id} onClick={() => addItem(p)} className="rounded-lg border border-border bg-card p-2 text-left hover:border-primary">
                  <div className="line-clamp-2 text-xs font-medium">{p.nome}</div>
                  <div className="text-sm font-bold text-primary">{fmtMoney(Number(p.preco_promo ?? p.preco))}</div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="acoes" className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <Label className="text-xs">Transferir mesa</Label>
              <div className="mt-1 flex gap-2">
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Mesa destino" /></SelectTrigger>
                  <SelectContent>
                    {tables.filter((t: any) => t.id !== mesa.id).map((t: any) => <SelectItem key={t.id} value={t.id}>Mesa {t.numero}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={transfer} disabled={!transferTo || !order}><ArrowRightLeft className="h-4 w-4" />Transferir</Button>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <Label className="text-xs">Unir com outra mesa</Label>
              <div className="mt-1 flex gap-2">
                <Select value={joinTo} onValueChange={setJoinTo}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Mesa a unir" /></SelectTrigger>
                  <SelectContent>
                    {tables.filter((t: any) => t.id !== mesa.id && !t.mesa_pai_id).map((t: any) => <SelectItem key={t.id} value={t.id}>Mesa {t.numero}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={juntar} disabled={!joinTo}><Link2 className="h-4 w-4" />Unir</Button>
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={desunir}>Desfazer união desta mesa</Button>
            </div>
          </TabsContent>

          <TabsContent value="hist" className="space-y-1 text-xs">
            {(history.data ?? []).length === 0 && <p className="py-4 text-center text-muted-foreground">Sem histórico ainda.</p>}
            {(history.data ?? []).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between rounded border border-border p-2">
                <span className="font-medium">{h.action}</span>
                <span className="text-muted-foreground">{fmtDate(h.created_at)}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

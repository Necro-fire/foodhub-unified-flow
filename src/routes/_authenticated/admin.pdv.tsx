import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/format";
import { Search, Plus, Minus, Trash2, ShoppingCart, Coffee, Store, Bike, PackageCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pdv")({
  component: PDVPage,
});

type CartLine = { product_id: string; nome: string; preco: number; quantidade: number };
type Atendimento = "balcao" | "mesa" | "retirada" | "delivery";

const ATENDIMENTOS: { key: Atendimento; label: string; icon: any; tipo: string; origem: string }[] = [
  { key: "balcao",   label: "Balcão",   icon: Store,        tipo: "retirada", origem: "pdv"  },
  { key: "mesa",     label: "Mesa",     icon: Coffee,       tipo: "local",    origem: "mesa" },
  { key: "retirada", label: "Retirada", icon: PackageCheck, tipo: "retirada", origem: "pdv"  },
  { key: "delivery", label: "Delivery", icon: Bike,         tipo: "entrega",  origem: "pdv"  },
];

function PDVPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [desc, setDesc] = useState(0);
  const [pgto, setPgto] = useState<"pix"|"dinheiro"|"credito"|"debito"|"vale"|"multiplo">("dinheiro");
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [mesaId, setMesaId] = useState<string>("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTel, setClienteTel] = useState("");
  const [obs, setObs] = useState("");
  const [taxa, setTaxa] = useState(0);
  const [horario, setHorario] = useState("");
  const [checkout, setCheckout] = useState(false);
  // delivery
  const [end, setEnd] = useState({ cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "", complemento: "", referencia: "" });
  const [cepLoading, setCepLoading] = useState(false);

  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await supabase.from("categories").select("*").eq("ativo", true).order("ordem")).data ?? [] });
  const products = useQuery({ queryKey: ["admin-products-pdv"], queryFn: async () => (await supabase.from("products").select("*").eq("ativo", true).eq("disponivel", true).order("nome")).data ?? [] });
  const mesas = useQuery({ queryKey: ["tables-pdv"], queryFn: async () => (await supabase.from("restaurant_tables").select("*").order("numero")).data ?? [] });

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
  const total = Math.max(0, subtotal - desc + (atendimento === "delivery" ? Number(taxa) : 0));

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    setEnd((e) => ({ ...e, cep }));
    if (cep.length !== 8) return;
    try {
      setCepLoading(true);
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) { toast.error("CEP não encontrado"); return; }
      setEnd((e) => ({ ...e, rua: j.logradouro || e.rua, bairro: j.bairro || e.bairro, cidade: j.localidade || e.cidade, estado: j.uf || e.estado }));
    } catch { toast.error("Falha ao buscar CEP"); }
    finally { setCepLoading(false); }
  }

  function openCheckout() {
    if (!atendimento) { toast.error("Selecione o tipo de atendimento"); return; }
    if (cart.length === 0) { toast.error("Adicione itens"); return; }
    if (atendimento === "mesa" && !mesaId) { toast.error("Selecione a mesa"); return; }
    if (atendimento === "delivery") {
      if (!clienteNome || !clienteTel) { toast.error("Nome e telefone são obrigatórios"); return; }
      if (!end.cep || !end.rua || !end.numero || !end.bairro || !end.cidade || !end.estado) { toast.error("Preencha o endereço"); return; }
    }
    if (atendimento === "retirada" && !clienteNome) { toast.error("Nome do cliente é obrigatório"); return; }
    setCheckout(true);
  }

  const finalize = useMutation({
    mutationFn: async () => {
      const cfg = ATENDIMENTOS.find((a) => a.key === atendimento)!;
      const payload: any = {
        cliente_nome: clienteNome || (atendimento === "mesa" ? `Mesa ${(mesas.data ?? []).find((m) => m.id === mesaId)?.numero ?? ""}` : "Balcão"),
        cliente_telefone: clienteTel || null,
        origem: cfg.origem, tipo: cfg.tipo,
        status: atendimento === "mesa" ? "em_preparo" : "finalizado",
        subtotal, desconto: desc,
        taxa_entrega: atendimento === "delivery" ? Number(taxa) : 0,
        total, forma_pagamento: pgto, observacoes: obs || null,
      };
      if (atendimento === "mesa") payload.mesa_id = mesaId;
      if (atendimento === "retirada" && horario) payload.horario_retirada = horario;
      if (atendimento === "delivery") {
        Object.assign(payload, {
          cep: end.cep, rua: end.rua, numero_endereco: end.numero, bairro: end.bairro,
          cidade: end.cidade, estado: end.estado, complemento: end.complemento || null,
          ponto_referencia: end.referencia || null,
          cliente_endereco: `${end.rua}, ${end.numero} - ${end.bairro}`,
        });
      }
      if (atendimento !== "mesa") payload.finalizado_em = new Date().toISOString();

      const { data: order, error } = await supabase.from("orders").insert(payload).select("id, numero").single();
      if (error) throw error;
      await supabase.from("order_items").insert(cart.map((i) => ({
        order_id: order!.id, product_id: i.product_id, produto_nome: i.nome,
        quantidade: i.quantidade, preco_unitario: i.preco, subtotal: i.preco * i.quantidade,
      })));
      if (atendimento === "mesa") {
        await supabase.from("restaurant_tables").update({ status: "ocupada", ocupada_em: new Date().toISOString() }).eq("id", mesaId);
      }
      if (atendimento !== "mesa") {
        const { data: session } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
        if (session) {
          await supabase.from("cash_movements").insert({
            session_id: session.id, tipo: "venda", valor: total,
            descricao: `${cfg.label} #${order!.numero}`, forma_pagamento: pgto, order_id: order!.id,
          });
        }
      }
      return order;
    },
    onSuccess: (order) => {
      toast.success(`Venda #${order!.numero} registrada`);
      setCart([]); setDesc(0); setClienteNome(""); setClienteTel(""); setObs(""); setTaxa(0); setHorario("");
      setMesaId(""); setAtendimento(null); setCheckout(false);
      setEnd({ cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "", complemento: "", referencia: "" });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3 overflow-hidden">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ATENDIMENTOS.map((a) => {
            const Icon = a.icon;
            const active = atendimento === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setAtendimento(a.key)}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground shadow" : "border-border bg-card hover:border-primary/40"}`}
              >
                <Icon className="h-4 w-4" /> {a.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Buscar produto..." />
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

      <Card className="flex flex-col overflow-hidden p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4" /> Comanda {atendimento && <span className="ml-auto text-xs font-normal text-muted-foreground">{ATENDIMENTOS.find((a) => a.key === atendimento)?.label}</span>}</h2>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {cart.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Sem itens</div>}
          {cart.map((i) => (
            <div key={i.product_id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium leading-tight">{i.nome}</div>
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
          {atendimento === "delivery" && (
            <div className="flex items-center justify-between">
              <span>Taxa entrega</span>
              <Input type="number" value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} className="h-8 w-24 text-right" />
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-display text-xl font-bold"><span>Total</span><span className="text-primary">{fmtMoney(total)}</span></div>
        </div>
        <Button size="lg" className="mt-3" disabled={cart.length === 0 || !atendimento} onClick={openCheckout}>
          {atendimento ? "Finalizar" : "Escolha o atendimento"}
        </Button>
      </Card>

      {checkout && (
        <Dialog open onOpenChange={() => setCheckout(false)}>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>Finalizar — {ATENDIMENTOS.find((a) => a.key === atendimento)?.label}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {atendimento === "mesa" && (
                <div><Label>Mesa *</Label>
                  <Select value={mesaId} onValueChange={setMesaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(mesas.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>Mesa {m.numero} — {m.capacidade} lug.</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(atendimento === "retirada" || atendimento === "delivery" || atendimento === "balcao") && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Nome {atendimento !== "balcao" && "*"}</Label><Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} /></div>
                  <div><Label>Telefone {atendimento === "delivery" && "*"}</Label><Input value={clienteTel} onChange={(e) => setClienteTel(e.target.value)} /></div>
                </div>
              )}

              {atendimento === "retirada" && (
                <div><Label>Horário previsto</Label><Input type="datetime-local" value={horario} onChange={(e) => setHorario(e.target.value)} /></div>
              )}

              {atendimento === "delivery" && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-[1fr_2fr] gap-2">
                    <div><Label>CEP *</Label><Input value={end.cep} onChange={(e) => lookupCep(e.target.value)} placeholder="00000-000" disabled={cepLoading} /></div>
                    <div><Label>Rua *</Label><Input value={end.rua} onChange={(e) => setEnd({ ...end, rua: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-[1fr_2fr] gap-2">
                    <div><Label>Número *</Label><Input value={end.numero} onChange={(e) => setEnd({ ...end, numero: e.target.value })} /></div>
                    <div><Label>Bairro *</Label><Input value={end.bairro} onChange={(e) => setEnd({ ...end, bairro: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-[2fr_1fr] gap-2">
                    <div><Label>Cidade *</Label><Input value={end.cidade} onChange={(e) => setEnd({ ...end, cidade: e.target.value })} /></div>
                    <div><Label>Estado *</Label><Input value={end.estado} maxLength={2} onChange={(e) => setEnd({ ...end, estado: e.target.value.toUpperCase() })} /></div>
                  </div>
                  <div><Label>Complemento</Label><Input value={end.complemento} onChange={(e) => setEnd({ ...end, complemento: e.target.value })} /></div>
                  <div><Label>Ponto de referência</Label><Input value={end.referencia} onChange={(e) => setEnd({ ...end, referencia: e.target.value })} /></div>
                </div>
              )}

              <div><Label>Observações</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>

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
                    <SelectItem value="multiplo">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-muted p-3 text-center font-display text-2xl font-bold text-primary">{fmtMoney(total)}</div>
              <Button className="w-full" size="lg" onClick={() => finalize.mutate()} disabled={finalize.isPending}>
                {finalize.isPending ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

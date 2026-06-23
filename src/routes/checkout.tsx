import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { useCart } from "@/lib/cart";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar pedido — Padaria" }] }),
  component: CheckoutPage,
});

type Tipo = "retirada" | "entrega";
type Pagto = "pix" | "dinheiro" | "credito" | "debito";

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<Tipo>("retirada");
  const [pagto, setPagto] = useState<Pagto>("pix");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [horarioRetirada, setHorarioRetirada] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
      return data;
    },
  });

  const taxa = tipo === "entrega" ? Number(settings.data?.taxa_entrega ?? 0) : 0;
  const total = subtotal + taxa;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!nome.trim() || !telefone.trim()) return toast.error("Preencha nome e telefone");
    if (tipo === "entrega" && !endereco.trim()) return toast.error("Endereço obrigatório para entrega");
    if (tipo === "entrega" && !bairro.trim()) return toast.error("Bairro obrigatório para entrega");

    setLoading(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        cliente_nome: nome,
        cliente_telefone: telefone,
        cliente_endereco: tipo === "entrega" ? endereco : null,
        bairro: tipo === "entrega" ? bairro || null : null,
        horario_retirada: tipo === "retirada" && horarioRetirada ? new Date(horarioRetirada).toISOString() : null,
        origem: "online",
        tipo,
        status: "novo",
        subtotal,
        taxa_entrega: taxa,
        total,
        forma_pagamento: pagto,
        observacoes: obs || null,
      })
      .select("id, numero")
      .single();

    if (error || !order) {
      setLoading(false);
      toast.error("Erro ao enviar pedido. Tente novamente.");
      return;
    }

    const itemsPayload = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      produto_nome: i.nome,
      quantidade: i.quantidade,
      preco_unitario: i.preco,
      subtotal: i.preco * i.quantidade,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
    if (itemsErr) {
      setLoading(false);
      toast.error("Erro ao registrar itens do pedido.");
      return;
    }

    clear();
    navigate({ to: "/pedido/$numero", params: { numero: String(order.numero) } });
  }

  if (items.length === 0) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-muted-foreground">Seu carrinho está vazio.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>Ver cardápio</Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">Finalizar pedido</h1>
        <form onSubmit={submit} className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Como você quer receber?</h2>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as Tipo)} className="grid grid-cols-2 gap-2">
              {(["retirada", "entrega"] as Tipo[]).map((t) => (
                <label key={t} className={`cursor-pointer rounded-lg border p-3 text-center text-sm font-medium capitalize transition ${tipo === t ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value={t} className="sr-only" />
                  {t === "retirada" ? "Retirar na padaria" : "Entrega"}
                </label>
              ))}
            </RadioGroup>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Seus dados</h2>
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="tel">Telefone *</Label>
              <Input id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
            </div>
            {tipo === "entrega" && (
              <>
                <div>
                  <Label htmlFor="end">Endereço (rua, número, complemento) *</Label>
                  <Textarea id="end" value={endereco} onChange={(e) => setEndereco(e.target.value)} rows={2} required />
                </div>
                <div>
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} required />
                </div>
              </>
            )}
            {tipo === "retirada" && (
              <div>
                <Label htmlFor="hora">Horário previsto para retirada</Label>
                <Input id="hora" type="datetime-local" value={horarioRetirada} onChange={(e) => setHorarioRetirada(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Ex: pão bem assado, sem gergelim…" />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Forma de pagamento</h2>
            <RadioGroup value={pagto} onValueChange={(v) => setPagto(v as Pagto)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["pix", "dinheiro", "credito", "debito"] as Pagto[]).map((p) => (
                <label key={p} className={`cursor-pointer rounded-lg border p-3 text-center text-sm capitalize ${pagto === p ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value={p} className="sr-only" />
                  {p === "pix" ? "Pix" : p === "dinheiro" ? "Dinheiro" : p === "credito" ? "Crédito" : "Débito"}
                </label>
              ))}
            </RadioGroup>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Resumo</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
              {taxa > 0 && <div className="flex justify-between"><span>Taxa de entrega</span><span>{fmtMoney(taxa)}</span></div>}
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-lg font-bold">
                <span>Total</span><span className="text-primary">{fmtMoney(total)}</span>
              </div>
            </div>
          </section>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? "Enviando..." : "Confirmar pedido"}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}

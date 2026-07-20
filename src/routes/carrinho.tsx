import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { ProductImage } from "@/components/ProductImage";
import { useCart } from "@/lib/cart";
import { useMesaSession } from "@/lib/mesa-session";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho — Padaria" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { mesa } = useMesaSession();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  async function sendToMesa() {
    if (!mesa || items.length === 0) return;
    setSending(true);
    // Procura pedido aberto da mesa
    const { data: existing } = await supabase
      .from("orders").select("id, subtotal")
      .eq("mesa_id", mesa.mesa_id)
      .not("status", "in", "(finalizado,cancelado)")
      .maybeSingle();

    let orderId = existing?.id as string | undefined;
    if (!orderId) {
      const { data: created, error } = await supabase.from("orders").insert({
        cliente_nome: `Mesa ${mesa.numero}`, origem: "mesa", tipo: "local",
        status: "novo", mesa_id: mesa.mesa_id, subtotal, total: subtotal,
      }).select("id").single();
      if (error || !created) { setSending(false); toast.error("Erro ao enviar pedido"); return; }
      orderId = created.id;
      await supabase.from("restaurant_tables").update({ status: "ocupada" }).eq("id", mesa.mesa_id);
    }

    const payload = items.map((i) => ({
      order_id: orderId!, product_id: i.product_id, produto_nome: i.nome,
      quantidade: i.quantidade, preco_unitario: i.preco, subtotal: i.preco * i.quantidade,
    }));
    await supabase.from("order_items").insert(payload);

    // Recalcula total
    const { data: allItems } = await supabase.from("order_items").select("subtotal").eq("order_id", orderId!);
    const newSubtotal = (allItems ?? []).reduce((s, x) => s + Number(x.subtotal), 0);
    await supabase.from("orders").update({ subtotal: newSubtotal, total: newSubtotal, status: "novo" }).eq("id", orderId!);

    clear();
    setSending(false);
    toast.success("Pedido enviado para a cozinha!");
    navigate({ to: "/" });
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">Seu carrinho</h1>

        {mesa && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
            <Coffee className="h-4 w-4 text-primary" />
            <span>Você está na <strong>Mesa {mesa.numero}</strong>. Envie direto para a cozinha.</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Button asChild className="mt-4"><Link to="/">Ver cardápio</Link></Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.product_id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <ProductImage src={i.imagem_url} alt={i.nome} className="h-16 w-16 rounded-lg" />
                  <div className="flex-1">
                    <div className="font-medium">{i.nome}</div>
                    <div className="text-sm text-muted-foreground">{fmtMoney(i.preco)} cada</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(i.product_id, i.quantidade - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-7 text-center text-sm font-medium">{i.quantidade}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(i.product_id, i.quantidade + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-semibold">{fmtMoney(i.preco * i.quantidade)}</div>
                  <Button variant="ghost" size="icon" onClick={() => remove(i.product_id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between text-lg">
                <span>Subtotal</span>
                <span className="font-display font-bold text-primary">{fmtMoney(subtotal)}</span>
              </div>
              {mesa ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">O pagamento será feito no balcão ao fechar a mesa.</p>
                  <Button className="mt-4 w-full" size="lg" disabled={sending} onClick={sendToMesa}>
                    {sending ? "Enviando..." : `Enviar para a Mesa ${mesa.numero}`}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">Frete e taxas calculados no checkout.</p>
                  <Button className="mt-4 w-full" size="lg" onClick={() => navigate({ to: "/checkout" })}>
                    Continuar para o pagamento
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}

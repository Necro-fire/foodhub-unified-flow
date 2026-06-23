import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PublicLayout } from "@/components/public/PublicLayout";
import { ProductImage } from "@/components/ProductImage";
import { useCart } from "@/lib/cart";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho — Padaria" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">Seu carrinho</h1>
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
              <p className="mt-1 text-xs text-muted-foreground">Frete e taxas calculados no checkout.</p>
              <Button className="mt-4 w-full" size="lg" onClick={() => navigate({ to: "/checkout" })}>
                Continuar para o pagamento
              </Button>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}

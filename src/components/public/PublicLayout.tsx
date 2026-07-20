import { Link } from "@tanstack/react-router";
import { ShoppingBag, Croissant, Coffee, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useMesaSession } from "@/lib/mesa-session";
import { Badge } from "@/components/ui/badge";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { count } = useCart();
  const { mesa, setMesa } = useMesaSession();
  return (
    <div className="min-h-screen bg-background">
      {mesa && (
        <div className="flex items-center justify-between gap-2 bg-primary px-4 py-1.5 text-xs text-primary-foreground">
          <span className="inline-flex items-center gap-1.5"><Coffee className="h-3 w-3" /> Você está na Mesa {mesa.numero}</span>
          <button onClick={() => setMesa(null)} className="inline-flex items-center gap-1 opacity-80 hover:opacity-100">
            <X className="h-3 w-3" /> Sair
          </button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Croissant className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Padaria</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/carrinho"
              className="relative inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent/40"
            >
              <ShoppingBag className="h-4 w-4" />
              Carrinho
              {count > 0 && (
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full bg-primary p-0 px-1.5 text-[10px] text-primary-foreground">
                  {count}
                </Badge>
              )}
            </Link>
            <Link
              to="/auth"
              className="hidden text-xs text-muted-foreground hover:text-foreground md:inline-flex"
            >
              Acesso padaria
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Padaria — Sistema de gestão & pedidos
      </footer>
    </div>
  );
}

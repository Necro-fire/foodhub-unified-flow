import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  product_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  imagem_url?: string;
  observacoes?: string;
};

const KEY = "cart_v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:update"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onUpdate = () => setItems(read());
    window.addEventListener("cart:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("cart:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const add = useCallback((item: Omit<CartItem, "quantidade"> & { quantidade?: number }) => {
    const current = read();
    const existing = current.find((i) => i.product_id === item.product_id);
    if (existing) existing.quantidade += item.quantidade ?? 1;
    else current.push({ ...item, quantidade: item.quantidade ?? 1 });
    write(current);
  }, []);

  const setQty = useCallback((product_id: string, qty: number) => {
    const current = read().map((i) => (i.product_id === product_id ? { ...i, quantidade: qty } : i));
    write(current.filter((i) => i.quantidade > 0));
  }, []);

  const remove = useCallback((product_id: string) => {
    write(read().filter((i) => i.product_id !== product_id));
  }, []);

  const clear = useCallback(() => write([]), []);

  const subtotal = items.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const count = items.reduce((s, i) => s + i.quantidade, 0);

  return { items, add, setQty, remove, clear, subtotal, count };
}

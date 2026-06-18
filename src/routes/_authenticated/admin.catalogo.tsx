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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtMoney } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/catalogo")({
  component: CatalogoPage,
});

function CatalogoPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Catálogo</h1>
      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos"><ProdutosTab /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProdutosTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);
  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(nome)").order("ordem");
      return data ?? [];
    },
  });
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("ordem")).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("products").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Produto excluído"); },
  });

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEdit({})}><Plus className="h-4 w-4" />Novo produto</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(products.data ?? []).map((p: any) => (
          <Card key={p.id} className="flex gap-3 p-3">
            <ProductImage src={p.imagem_url} alt={p.nome} className="h-20 w-20 shrink-0 rounded-lg" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">{p.categories?.nome ?? "Sem categoria"}</div>
                </div>
                <div className="font-display font-bold text-primary">{fmtMoney(p.preco_promo ?? p.preco)}</div>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  {p.ativo ? <span className="text-xs text-success">Ativo</span> : <span className="text-xs text-muted-foreground">Inativo</span>}
                  {!p.disponivel && <span className="text-xs text-warning">• Indisponível</span>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) del.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {edit !== null && <ProductDialog categories={categories.data ?? []} value={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function ProductDialog({ value, categories, onClose }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: value.nome ?? "",
    descricao: value.descricao ?? "",
    category_id: value.category_id ?? (categories[0]?.id ?? null),
    preco: value.preco ?? 0,
    preco_promo: value.preco_promo ?? "",
    imagem_url: value.imagem_url ?? "",
    ativo: value.ativo ?? true,
    disponivel: value.disponivel ?? true,
    ordem: value.ordem ?? 0,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        preco: Number(form.preco),
        preco_promo: form.preco_promo === "" ? null : Number(form.preco_promo),
      };
      if (value.id) await supabase.from("products").update(payload).eq("id", value.id);
      else await supabase.from("products").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{value.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço</Label><Input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value as any })} /></div>
            <div><Label>Promoção</Label><Input type="number" step="0.01" value={form.preco_promo} onChange={(e) => setForm({ ...form, preco_promo: e.target.value as any })} /></div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>URL da imagem (opcional)</Label><Input value={form.imagem_url} onChange={(e) => setForm({ ...form, imagem_url: e.target.value })} /></div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.disponivel} onCheckedChange={(v) => setForm({ ...form, disponivel: v })} />Disponível
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriasTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);
  const cats = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("ordem")).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("categories").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Excluída"); },
  });
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEdit({})}><Plus className="h-4 w-4" />Nova categoria</Button>
      </div>
      <div className="grid gap-2">
        {(cats.data ?? []).map((c: any) => (
          <Card key={c.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.icone}</span>
              <div>
                <div className="font-semibold">{c.nome}</div>
                <div className="text-xs text-muted-foreground">/{c.slug} · ordem {c.ordem}{c.ativo ? "" : " · inativa"}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) del.mutate(c.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {edit !== null && <CategoryDialog value={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function CategoryDialog({ value, onClose }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: value.nome ?? "",
    slug: value.slug ?? "",
    icone: value.icone ?? "🍕",
    ordem: value.ordem ?? 0,
    ativo: value.ativo ?? true,
  });
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, ordem: Number(form.ordem), slug: form.slug || form.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") };
      if (value.id) await supabase.from("categories").update(payload).eq("id", value.id);
      else await supabase.from("categories").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{value.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="gerado-automaticamente" /></div>
            <div><Label>Ícone (emoji)</Label><Input value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })} /></div>
          </div>
          <div><Label>Ordem</Label><Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value as any })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />Ativa
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

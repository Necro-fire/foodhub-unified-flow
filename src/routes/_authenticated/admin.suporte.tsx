import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search, HelpCircle, MessageCircle, ArrowLeft, Star, CheckCircle2, XCircle,
  Plus, Edit, Trash2, Copy, ExternalLink, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/suporte")({
  component: SupportPage,
});

type Category = {
  id: string; nome: string; slug: string; icone: string; ordem: number; ativo: boolean;
};
type Problem = {
  id: string; category_id: string; titulo: string; descricao: string;
  causas: string[]; passos: string[]; observacoes: string;
  imagem_url: string; video_url: string; doc_url: string;
  ordem: number; ativo: boolean;
};

function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Central de Suporte</h1>
        <p className="text-sm text-muted-foreground">Atendimento guiado, base de conhecimento e métricas.</p>
      </div>
      <Tabs defaultValue="atendimento" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="atendimento">Atendimento</TabsTrigger>
          <TabsTrigger value="base">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="atendimento" className="mt-4"><Atendimento /></TabsContent>
        <TabsContent value="base" className="mt-4"><Base /></TabsContent>
        <TabsContent value="historico" className="mt-4"><Historico /></TabsContent>
        <TabsContent value="dashboard" className="mt-4"><DashboardSup /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ ATENDIMENTO ============

type Step = "categoria" | "problema" | "solucao" | "confirmar" | "resolvido" | "nao_resolvido";

function Atendimento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("categoria");
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<Category | null>(null);
  const [prob, setProb] = useState<Problem | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [descAdicional, setDescAdicional] = useState("");
  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState("");

  const categorias = useQuery({
    queryKey: ["support_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_categories" as any).select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
  });
  const problemas = useQuery({
    queryKey: ["support_problems", cat?.id],
    enabled: !!cat,
    queryFn: async () => {
      const { data, error } = await supabase.from("support_problems" as any).select("*").eq("category_id", cat!.id).eq("ativo", true).order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as Problem[];
    },
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });

  const buscaAll = useQuery({
    queryKey: ["support_problems_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_problems" as any).select("*, support_categories(nome, slug)").eq("ativo", true).order("ordem");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return [];
    const q = busca.toLowerCase();
    return (buscaAll.data ?? []).filter((p: any) =>
      p.titulo.toLowerCase().includes(q) || p.descricao?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [busca, buscaAll.data]);

  function resetAll() {
    setStep("categoria"); setCat(null); setProb(null); setTicketId(null);
    setDescAdicional(""); setEstrelas(5); setComentario("");
  }

  async function iniciarTicket(catObj: Category, probObj: Problem) {
    if (!user) return null;
    const { data, error } = await supabase.from("support_tickets" as any).insert({
      user_id: user.id,
      category_id: catObj.id,
      problem_id: probObj.id,
      categoria_nome: catObj.nome,
      problema_titulo: probObj.titulo,
    } as any).select("id").single();
    if (error) { toast.error(error.message); return null; }
    setTicketId((data as any).id);
    return (data as any).id as string;
  }

  async function marcarResolvido(resolvido: boolean, whatsapp = false) {
    if (!ticketId) return;
    await supabase.from("support_tickets" as any).update({
      resolvido, encaminhado_whatsapp: whatsapp, descricao_adicional: descAdicional,
    } as any).eq("id", ticketId);
    qc.invalidateQueries({ queryKey: ["support_tickets_hist"] });
    qc.invalidateQueries({ queryKey: ["support_metrics"] });
  }

  async function enviarAvaliacao() {
    if (!ticketId || !user) return;
    const { error } = await supabase.from("support_ratings" as any).insert({
      ticket_id: ticketId, user_id: user.id, estrelas, comentario,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Obrigado pela avaliação!"); resetAll(); }
  }

  function abrirWhatsApp() {
    const numero = (settings.data?.whatsapp_suporte || "").replace(/\D/g, "");
    if (!numero) {
      toast.error("Número do WhatsApp de suporte não configurado. Vá em Configurações.");
      return;
    }
    const msg =
`Olá! Preciso de suporte.

Sistema: ${settings.data?.nome_estabelecimento ?? "Sistema"}
Usuário: ${user?.email ?? "—"}
Categoria: ${cat?.nome ?? "—"}
Problema: ${prob?.titulo ?? "—"}
Solução automática apresentada: ${prob?.titulo ?? "—"}
Resultado: Não resolveu.
Descrição adicional: ${descAdicional || "—"}

Data: ${new Date().toLocaleDateString("pt-BR")}
Hora: ${new Date().toLocaleTimeString("pt-BR")}`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
    marcarResolvido(false, true);
  }

  function copiarSolucao() {
    if (!prob) return;
    const t = [
      prob.titulo,
      prob.descricao,
      prob.causas.length ? "\nPossíveis causas:\n- " + prob.causas.join("\n- ") : "",
      prob.passos.length ? "\nPassos:\n" + prob.passos.map((p, i) => `${i + 1}. ${p}`).join("\n") : "",
      prob.observacoes ? "\nObservações: " + prob.observacoes : "",
    ].join("\n");
    navigator.clipboard.writeText(t);
    toast.success("Solução copiada");
  }

  // ------- Render -------
  return (
    <div className="space-y-4">
      {/* Busca + Falar com suporte sempre visíveis */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por palavra-chave (ex: impressora, pagamento, senha)…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={abrirWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" /> Falar com suporte
          </Button>
        </div>
        {resultadosBusca.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            {resultadosBusca.map((p: any) => (
              <button
                key={p.id}
                onClick={() => {
                  const c = categorias.data?.find(c => c.id === p.category_id) ?? null;
                  setCat(c); setProb(p); setStep("solucao");
                  setBusca("");
                  if (c) iniciarTicket(c, p);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{p.titulo}</span>
                  <span className="ml-2 text-xs text-muted-foreground">· {p.support_categories?.nome}</span>
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </Card>

      {step === "categoria" && (
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">1. Escolha a categoria do problema</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categorias.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCat(c); setStep("problema"); }}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">Ver problemas</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === "problema" && cat && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">2. Qual é o problema em <span className="text-primary">{cat.nome}</span>?</h2>
            <Button variant="ghost" size="sm" onClick={() => { setStep("categoria"); setCat(null); }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          </div>
          {problemas.data && problemas.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum problema cadastrado nessa categoria.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {problemas.data?.map((p) => (
              <button
                key={p.id}
                onClick={async () => { setProb(p); setStep("solucao"); await iniciarTicket(cat, p); }}
                className="rounded-lg border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
              >
                <div className="font-medium">{p.titulo}</div>
                {p.descricao && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</div>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === "solucao" && prob && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Solução sugerida
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setStep(cat ? "problema" : "categoria")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          </div>
          <h3 className="font-display text-xl font-bold">{prob.titulo}</h3>
          {prob.descricao && <p className="mt-1 text-sm text-muted-foreground">{prob.descricao}</p>}

          {prob.imagem_url && <img src={prob.imagem_url} alt="" className="mt-4 rounded-lg border" />}
          {prob.video_url && (
            <div className="mt-4 aspect-video overflow-hidden rounded-lg border">
              <iframe src={prob.video_url} className="h-full w-full" allowFullScreen />
            </div>
          )}

          {prob.causas.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold">Possíveis causas</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {prob.causas.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {prob.passos.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold">Passo a passo</div>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                {prob.passos.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            </div>
          )}
          {prob.observacoes && (
            <div className="mt-4 rounded-md border-l-4 border-warning bg-warning/10 p-3 text-sm">
              <strong>Observações: </strong>{prob.observacoes}
            </div>
          )}
          {prob.doc_url && (
            <a href={prob.doc_url} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1 text-sm text-primary underline">
              <ExternalLink className="h-3 w-3" /> Ver documentação
            </a>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={copiarSolucao}>
              <Copy className="mr-2 h-4 w-4" /> Copiar instruções
            </Button>
            <div className="flex-1" />
            <span className="text-sm font-medium">Seu problema foi resolvido?</span>
            <Button size="sm" onClick={() => { marcarResolvido(true); setStep("resolvido"); }}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Sim, resolveu
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setStep("nao_resolvido")}>
              <XCircle className="mr-1 h-4 w-4" /> Não resolveu
            </Button>
          </div>
        </Card>
      )}

      {step === "resolvido" && (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-lg font-bold">Ficamos felizes que seu problema foi resolvido!</div>
              <div className="text-sm text-muted-foreground">Avalie o atendimento (opcional).</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setEstrelas(n)}>
                <Star className={`h-7 w-7 ${n <= estrelas ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            className="mt-3"
            rows={3}
            placeholder="Deixe um comentário (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={enviarAvaliacao}>Enviar avaliação</Button>
            <Button variant="outline" onClick={resetAll}>Novo atendimento</Button>
          </div>
        </Card>
      )}

      {step === "nao_resolvido" && (
        <Card className="p-5">
          <div className="font-display text-lg font-bold">Vamos conectar você ao suporte humano</div>
          <p className="text-sm text-muted-foreground">Descreva rapidamente o que você tentou (opcional). Enviaremos junto ao suporte.</p>
          <Textarea
            className="mt-3"
            rows={4}
            placeholder="O que aconteceu, códigos de erro, prints, etc."
            value={descAdicional}
            onChange={(e) => setDescAdicional(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={abrirWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" /> Entrar em contato pelo WhatsApp
            </Button>
            <Button variant="outline" onClick={() => cat ? setStep("problema") : setStep("categoria")}>
              Voltar para outras soluções
            </Button>
            <Button variant="ghost" onClick={resetAll}>Iniciar novo atendimento</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============ BASE DE CONHECIMENTO (CRUD) ============

function Base() {
  const qc = useQueryClient();
  const categorias = useQuery({
    queryKey: ["support_categories_admin"],
    queryFn: async () => (await supabase.from("support_categories" as any).select("*").order("ordem")).data as unknown as Category[],
  });
  const problemas = useQuery({
    queryKey: ["support_problems_admin"],
    queryFn: async () => (await supabase.from("support_problems" as any).select("*").order("ordem")).data as unknown as Problem[],
  });

  const [catOpen, setCatOpen] = useState(false);
  const [catEdit, setCatEdit] = useState<Partial<Category> | null>(null);
  const [probOpen, setProbOpen] = useState(false);
  const [probEdit, setProbEdit] = useState<Partial<Problem> | null>(null);

  async function saveCat() {
    if (!catEdit?.nome || !catEdit?.slug) { toast.error("Nome e slug obrigatórios"); return; }
    const payload = { nome: catEdit.nome, slug: catEdit.slug, icone: catEdit.icone || "HelpCircle", ordem: catEdit.ordem ?? 0, ativo: catEdit.ativo ?? true };
    const { error } = catEdit.id
      ? await supabase.from("support_categories" as any).update(payload as any).eq("id", catEdit.id)
      : await supabase.from("support_categories" as any).insert(payload as any);
    if (error) toast.error(error.message);
    else { toast.success("Salvo"); setCatOpen(false); setCatEdit(null); qc.invalidateQueries(); }
  }
  async function delCat(id: string) {
    if (!confirm("Excluir categoria e todos seus problemas?")) return;
    const { error } = await supabase.from("support_categories" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  }

  async function saveProb() {
    if (!probEdit?.category_id || !probEdit?.titulo) { toast.error("Categoria e título obrigatórios"); return; }
    const payload = {
      category_id: probEdit.category_id,
      titulo: probEdit.titulo,
      descricao: probEdit.descricao ?? "",
      causas: probEdit.causas ?? [],
      passos: probEdit.passos ?? [],
      observacoes: probEdit.observacoes ?? "",
      imagem_url: probEdit.imagem_url ?? "",
      video_url: probEdit.video_url ?? "",
      doc_url: probEdit.doc_url ?? "",
      ordem: probEdit.ordem ?? 0,
      ativo: probEdit.ativo ?? true,
    };
    const { error } = probEdit.id
      ? await supabase.from("support_problems" as any).update(payload as any).eq("id", probEdit.id)
      : await supabase.from("support_problems" as any).insert(payload as any);
    if (error) toast.error(error.message);
    else { toast.success("Salvo"); setProbOpen(false); setProbEdit(null); qc.invalidateQueries(); }
  }
  async function delProb(id: string) {
    if (!confirm("Excluir este problema?")) return;
    const { error } = await supabase.from("support_problems" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Categorias */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Categorias</h2>
          <Button size="sm" onClick={() => { setCatEdit({ ativo: true, ordem: (categorias.data?.length ?? 0) + 1 }); setCatOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nova
          </Button>
        </div>
        <div className="divide-y">
          {categorias.data?.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.nome}</div>
                <div className="text-xs text-muted-foreground">/{c.slug} · ordem {c.ordem}</div>
              </div>
              {!c.ativo && <Badge variant="secondary">Inativa</Badge>}
              <Button variant="ghost" size="icon" onClick={() => { setCatEdit(c); setCatOpen(true); }}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => delCat(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Problemas */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Problemas / Soluções</h2>
          <Button size="sm" onClick={() => { setProbEdit({ ativo: true, causas: [], passos: [] }); setProbOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Novo
          </Button>
        </div>
        <div className="divide-y">
          {problemas.data?.map((p) => {
            const c = categorias.data?.find(x => x.id === p.category_id);
            return (
              <div key={p.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.titulo}</div>
                  <div className="text-xs text-muted-foreground">{c?.nome ?? "—"}</div>
                </div>
                {!p.ativo && <Badge variant="secondary">Inativo</Badge>}
                <Button variant="ghost" size="icon" onClick={() => { setProbEdit(p); setProbOpen(true); }}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => delProb(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dialog Categoria */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{catEdit?.id ? "Editar" : "Nova"} categoria</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nome</Label><Input value={catEdit?.nome ?? ""} onChange={(e) => setCatEdit({ ...catEdit, nome: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={catEdit?.slug ?? ""} onChange={(e) => setCatEdit({ ...catEdit, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordem</Label><Input type="number" value={catEdit?.ordem ?? 0} onChange={(e) => setCatEdit({ ...catEdit, ordem: Number(e.target.value) })} /></div>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <Switch checked={catEdit?.ativo ?? true} onCheckedChange={(v) => setCatEdit({ ...catEdit, ativo: v })} />
                Ativa
              </label>
            </div>
          </div>
          <DialogFooter><Button onClick={saveCat}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Problema */}
      <Dialog open={probOpen} onOpenChange={setProbOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{probEdit?.id ? "Editar" : "Novo"} problema</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Categoria</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={probEdit?.category_id ?? ""}
                onChange={(e) => setProbEdit({ ...probEdit, category_id: e.target.value })}
              >
                <option value="">Selecione…</option>
                {categorias.data?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div><Label>Título</Label><Input value={probEdit?.titulo ?? ""} onChange={(e) => setProbEdit({ ...probEdit, titulo: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={probEdit?.descricao ?? ""} onChange={(e) => setProbEdit({ ...probEdit, descricao: e.target.value })} /></div>
            <div>
              <Label>Possíveis causas (uma por linha)</Label>
              <Textarea rows={3}
                value={(probEdit?.causas ?? []).join("\n")}
                onChange={(e) => setProbEdit({ ...probEdit, causas: e.target.value.split("\n").filter(Boolean) })}
              />
            </div>
            <div>
              <Label>Passos (um por linha)</Label>
              <Textarea rows={4}
                value={(probEdit?.passos ?? []).join("\n")}
                onChange={(e) => setProbEdit({ ...probEdit, passos: e.target.value.split("\n").filter(Boolean) })}
              />
            </div>
            <div><Label>Observações</Label><Textarea rows={2} value={probEdit?.observacoes ?? ""} onChange={(e) => setProbEdit({ ...probEdit, observacoes: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Imagem (URL)</Label><Input value={probEdit?.imagem_url ?? ""} onChange={(e) => setProbEdit({ ...probEdit, imagem_url: e.target.value })} /></div>
              <div><Label>Vídeo (embed URL)</Label><Input value={probEdit?.video_url ?? ""} onChange={(e) => setProbEdit({ ...probEdit, video_url: e.target.value })} /></div>
              <div><Label>Documentação (URL)</Label><Input value={probEdit?.doc_url ?? ""} onChange={(e) => setProbEdit({ ...probEdit, doc_url: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordem</Label><Input type="number" value={probEdit?.ordem ?? 0} onChange={(e) => setProbEdit({ ...probEdit, ordem: Number(e.target.value) })} /></div>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <Switch checked={probEdit?.ativo ?? true} onCheckedChange={(v) => setProbEdit({ ...probEdit, ativo: v })} />
                Ativo
              </label>
            </div>
          </div>
          <DialogFooter><Button onClick={saveProb}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ HISTÓRICO ============

function Historico() {
  const tickets = useQuery({
    queryKey: ["support_tickets_hist"],
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets" as any)
        .select("*, support_ratings(estrelas, comentario)")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as any[];
    },
  });

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold">Atendimentos recentes</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Data</th>
              <th className="py-2 pr-3">Categoria</th>
              <th className="py-2 pr-3">Problema</th>
              <th className="py-2 pr-3">Resultado</th>
              <th className="py-2 pr-3">WhatsApp</th>
              <th className="py-2 pr-3">Avaliação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tickets.data?.map((t) => (
              <tr key={t.id}>
                <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                <td className="py-2 pr-3">{t.categoria_nome ?? "—"}</td>
                <td className="py-2 pr-3">{t.problema_titulo ?? "—"}</td>
                <td className="py-2 pr-3">
                  {t.resolvido === true ? <Badge className="bg-success text-success-foreground">Resolveu</Badge>
                    : t.resolvido === false ? <Badge variant="destructive">Não resolveu</Badge>
                    : <Badge variant="secondary">Em andamento</Badge>}
                </td>
                <td className="py-2 pr-3">{t.encaminhado_whatsapp ? "Sim" : "—"}</td>
                <td className="py-2 pr-3">
                  {t.support_ratings?.[0]?.estrelas ? `${t.support_ratings[0].estrelas}★` : "—"}
                </td>
              </tr>
            ))}
            {tickets.data?.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum atendimento ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============ DASHBOARD ============

function DashboardSup() {
  const metrics = useQuery({
    queryKey: ["support_metrics"],
    queryFn: async () => {
      const { data: tickets } = await supabase.from("support_tickets" as any).select("resolvido, encaminhado_whatsapp, categoria_nome");
      const { data: ratings } = await supabase.from("support_ratings" as any).select("estrelas");
      const total = tickets?.length ?? 0;
      const resolvidos = tickets?.filter((t: any) => t.resolvido === true).length ?? 0;
      const whats = tickets?.filter((t: any) => t.encaminhado_whatsapp).length ?? 0;
      const taxa = total ? Math.round((resolvidos / total) * 100) : 0;
      const porCat = new Map<string, number>();
      for (const t of tickets ?? []) {
        const k = (t as any).categoria_nome ?? "—";
        porCat.set(k, (porCat.get(k) ?? 0) + 1);
      }
      const top = Array.from(porCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const avgRating = ratings?.length ? (ratings.reduce((s: number, r: any) => s + r.estrelas, 0) / ratings.length).toFixed(1) : "—";
      return { total, resolvidos, whats, taxa, top, avgRating };
    },
  });
  const m = metrics.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total de atendimentos" value={String(m?.total ?? 0)} />
        <Kpi label="Resolvidos automaticamente" value={String(m?.resolvidos ?? 0)} />
        <Kpi label="Encaminhados ao WhatsApp" value={String(m?.whats ?? 0)} />
        <Kpi label="Taxa de autoatendimento" value={`${m?.taxa ?? 0}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Categorias com mais chamados</h3>
          <div className="space-y-2">
            {(m?.top ?? []).map(([nome, qty]) => (
              <div key={nome} className="flex items-center justify-between text-sm">
                <span>{nome}</span>
                <Badge variant="secondary">{qty}</Badge>
              </div>
            ))}
            {(!m?.top || m.top.length === 0) && <div className="text-sm text-muted-foreground">Sem dados.</div>}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Avaliação média</h3>
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 fill-warning text-warning" />
            <span className="font-display text-3xl font-bold">{m?.avgRating ?? "—"}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </Card>
  );
}

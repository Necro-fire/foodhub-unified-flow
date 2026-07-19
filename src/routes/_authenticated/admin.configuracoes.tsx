import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (settings.data) setForm(settings.data); }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("settings").update({
        nome_estabelecimento: form.nome_estabelecimento,
        descricao: form.descricao,
        horario_funcionamento: form.horario_funcionamento,
        telefone: form.telefone,
        endereco: form.endereco,
        taxa_entrega: Number(form.taxa_entrega),
        aceita_pedidos_online: form.aceita_pedidos_online,
        whatsapp_suporte: form.whatsapp_suporte ?? "",
      } as any).eq("id", 1);
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return <div>Carregando...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-bold">Configurações</h1>
      <Card className="space-y-3 p-5">
        <div><Label>Nome do estabelecimento</Label><Input value={form.nome_estabelecimento} onChange={(e) => setForm({ ...form, nome_estabelecimento: e.target.value })} /></div>
        <div><Label>Descrição</Label><Textarea value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Horário</Label><Input value={form.horario_funcionamento ?? ""} onChange={(e) => setForm({ ...form, horario_funcionamento: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        </div>
        <div><Label>Endereço</Label><Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
        <div><Label>Taxa de entrega (R$)</Label><Input type="number" step="0.01" value={form.taxa_entrega} onChange={(e) => setForm({ ...form, taxa_entrega: e.target.value })} /></div>
        <div>
          <Label>WhatsApp do suporte (com DDI, ex: +55 11 99999-9999)</Label>
          <Input value={form.whatsapp_suporte ?? ""} onChange={(e) => setForm({ ...form, whatsapp_suporte: e.target.value })} placeholder="+5511999999999" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.aceita_pedidos_online} onCheckedChange={(v) => setForm({ ...form, aceita_pedidos_online: v })} />
          Aceitar pedidos online
        </label>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar configurações</Button>
      </Card>
    </div>
  );
}

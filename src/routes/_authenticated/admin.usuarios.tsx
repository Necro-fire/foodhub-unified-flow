import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsuariosPage,
});

const ROLES = ["proprietario", "admin", "gerente", "caixa", "garcom", "cozinha", "producao", "estoque", "financeiro", "operador"] as const;
const ROLE_LABEL: Record<string, string> = {
  proprietario: "Proprietário", admin: "Administrador", gerente: "Gerente", caixa: "Caixa",
  garcom: "Garçom", cozinha: "Cozinha", producao: "Produção", estoque: "Estoque",
  financeiro: "Financeiro", operador: "Operador",
};
const MODULES = ["dashboard","pedidos","pdv","mesas","caixa","vendas","catalogo","kds","usuarios","suporte","configuracoes"] as const;
const MODULE_LABEL: Record<string, string> = {
  dashboard: "Dashboard", pedidos: "Pedidos", pdv: "PDV", mesas: "Mesas", caixa: "Caixa",
  vendas: "Vendas", catalogo: "Catálogo", kds: "KDS Cozinha", usuarios: "Usuários",
  suporte: "Suporte", configuracoes: "Configurações",
};

function UsuariosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Usuários & Permissões</h1>
        <p className="text-sm text-muted-foreground">Gerencie os perfis da equipe e o que cada papel pode acessar.</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" />Equipe</TabsTrigger>
          <TabsTrigger value="perms"><Shield className="mr-1 h-4 w-4" />Permissões por papel</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="perms"><PermsMatrix /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const profiles = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => (await supabase.from("profiles").select("id, nome, email, created_at").order("created_at", { ascending: false })).data ?? [],
  });
  const rolesQ = useQuery({
    queryKey: ["user-roles-all"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  const rolesByUser: Record<string, string[]> = {};
  (rolesQ.data ?? []).forEach((r: any) => { (rolesByUser[r.user_id] ??= []).push(r.role); });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    },
    onSuccess: () => { toast.success("Papel atualizado"); qc.invalidateQueries({ queryKey: ["user-roles-all"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        Para adicionar um novo membro, peça para ele criar conta em <code>/auth</code>. Depois altere o papel aqui.
      </div>
      <div className="space-y-2">
        {(profiles.data ?? []).map((p: any) => {
          const currentRole = (rolesByUser[p.id] ?? [])[0] ?? "operador";
          return (
            <div key={p.id} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_240px]">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.nome ?? p.email}</div>
                <div className="truncate text-xs text-muted-foreground">{p.email}</div>
              </div>
              <Badge variant="outline">{ROLE_LABEL[currentRole] ?? currentRole}</Badge>
              <Select value={currentRole} onValueChange={(v) => setRole.mutate({ userId: p.id, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        })}
        {(profiles.data ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário ainda.</p>}
      </div>
    </Card>
  );
}

function PermsMatrix() {
  const qc = useQueryClient();
  const perms = useQuery({
    queryKey: ["role-perms"],
    queryFn: async () => (await supabase.from("role_permissions").select("*")).data ?? [],
  });

  const map: Record<string, Record<string, { view: boolean; edit: boolean; id?: string }>> = {};
  ROLES.forEach((r) => { map[r] = {}; MODULES.forEach((m) => { map[r][m] = { view: false, edit: false }; }); });
  (perms.data ?? []).forEach((p: any) => { if (map[p.role]?.[p.module]) map[p.role][p.module] = { view: p.can_view, edit: p.can_edit, id: p.id }; });

  const toggle = useMutation({
    mutationFn: async ({ role, module, field, value }: { role: string; module: string; field: "can_view" | "can_edit"; value: boolean }) => {
      const existing = (perms.data ?? []).find((p: any) => p.role === role && p.module === module);
      if (existing) {
        await supabase.from("role_permissions").update({ [field]: value } as any).eq("id", existing.id);
      } else {
        await supabase.from("role_permissions").insert({ role: role as any, module, can_view: field === "can_view" ? value : false, can_edit: field === "can_edit" ? value : false });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-perms"] }),
  });

  const [role, setRole] = useState<string>("gerente");

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Papel:</span>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2">Módulo</th>
              <th className="p-2 text-center">Ver</th>
              <th className="p-2 text-center">Editar</th>
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => {
              const val = map[role][m];
              return (
                <tr key={m} className="border-b">
                  <td className="p-2 font-medium">{MODULE_LABEL[m]}</td>
                  <td className="p-2 text-center">
                    <Checkbox checked={val.view} onCheckedChange={(v) => toggle.mutate({ role, module: m, field: "can_view", value: !!v })} />
                  </td>
                  <td className="p-2 text-center">
                    <Checkbox checked={val.edit} onCheckedChange={(v) => toggle.mutate({ role, module: m, field: "can_edit", value: !!v })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Alterações são salvas automaticamente. A aplicação das permissões no menu lateral acontece nos próximos módulos.</p>
    </Card>
  );
}

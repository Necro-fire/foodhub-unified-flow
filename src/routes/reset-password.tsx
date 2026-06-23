import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Nova senha — Padaria" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida!");
    navigate({ to: "/admin" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-warm p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-card p-8 shadow-elevated">
        <h1 className="font-display text-2xl font-bold">Nova senha</h1>
        <div>
          <Label>Nova senha</Label>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={6} />
        </div>
        <Button disabled={loading} className="w-full">{loading ? "Salvando..." : "Salvar"}</Button>
      </form>
    </div>
  );
}

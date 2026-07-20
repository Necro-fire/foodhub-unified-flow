import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setMesaSession } from "@/lib/mesa-session";
import { PublicLayout } from "@/components/public/PublicLayout";
import { Coffee } from "lucide-react";

export const Route = createFileRoute("/mesa/$numero")({
  head: ({ params }) => ({ meta: [{ title: `Mesa ${params.numero} — Cardápio` }] }),
  component: MesaEntryPage,
});

function MesaEntryPage() {
  const { numero } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id, numero")
        .eq("numero", Number(numero))
        .maybeSingle();
      if (error || !data) {
        setError("Mesa não encontrada. Chame um atendente.");
        return;
      }
      setMesaSession({ mesa_id: data.id, numero: data.numero });
      navigate({ to: "/", replace: true });
    })();
  }, [numero, navigate]);

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Coffee className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Mesa {numero}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "Abrindo cardápio da sua mesa..."}
        </p>
      </div>
    </PublicLayout>
  );
}

export const fmtMoney = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

export const fmtDateOnly = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d));

export const fmtTime = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(d));

export const statusLabel: Record<string, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  saiu_entrega: "Saiu p/ entrega",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const statusColor: Record<string, string> = {
  novo: "bg-accent text-accent-foreground",
  confirmado: "bg-chart-4/20 text-chart-4",
  em_preparo: "bg-warning text-warning-foreground",
  pronto: "bg-success text-success-foreground",
  saiu_entrega: "bg-chart-4 text-white",
  finalizado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/20 text-destructive",
};

export const paymentLabel: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  vale: "Vale",
  multiplo: "Múltiplo",
  nao_definido: "—",
};

export const tipoLabel: Record<string, string> = {
  retirada: "Retirada",
  local: "Consumo no local",
  entrega: "Entrega",
};

export const origemLabel: Record<string, string> = {
  pdv: "PDV",
  mesa: "Mesa",
  online: "Online",
};

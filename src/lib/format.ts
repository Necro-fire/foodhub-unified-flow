export const fmtMoney = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

export const fmtDateOnly = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d));

export const fmtTime = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(d));

export const statusLabel: Record<string, string> = {
  novo: "Novo Pedido",
  confirmado: "Confirmado",
  em_preparo: "Em Produção",
  pronto: "Pronto",
  saiu_entrega: "Em Rota de Entrega",
  entregue: "Pedido Entregue",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const statusColor: Record<string, string> = {
  novo: "bg-chart-4/20 text-chart-4 border border-chart-4/40",
  confirmado: "bg-chart-4/20 text-chart-4",
  em_preparo: "bg-warning text-warning-foreground",
  pronto: "bg-accent text-accent-foreground",
  saiu_entrega: "bg-chart-4 text-white",
  entregue: "bg-success text-success-foreground",
  finalizado: "bg-success text-success-foreground",
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
  local: "Mesa",
  entrega: "Entrega",
};

/** Cor por categoria de pedido (Mesa azul, Entrega verde, Retirada laranja) */
export const tipoColor: Record<string, string> = {
  local: "bg-chart-4/15 text-chart-4 border-chart-4/40",
  entrega: "bg-success/15 text-success border-success/40",
  retirada: "bg-warning/20 text-warning-foreground border-warning/40",
};

export const tipoDot: Record<string, string> = {
  local: "bg-chart-4",
  entrega: "bg-success",
  retirada: "bg-warning",
};

export const origemLabel: Record<string, string> = {
  pdv: "PDV",
  mesa: "Mesa",
  online: "Online",
};

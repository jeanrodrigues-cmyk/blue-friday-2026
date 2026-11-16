// Calendário único da campanha Blue Friday 2026.
// Todos os seletores de semana usam estes rótulos e abrem na semana atual.
// Áreas que apuram só dias úteis mantêm a própria regra de cálculo;
// o rótulo exibido continua sendo o da semana da campanha.
export type CampaignWeek = { index: number; start: string; end: string; range: string; label: string };

export const CAMPAIGN_WEEKS: CampaignWeek[] = [
  { index: 0, start: "2026-11-01", end: "2026-11-08", range: "01 a 08/11", label: "Semana 1 · 01 a 08/11" },
  { index: 1, start: "2026-11-09", end: "2026-11-15", range: "09 a 15/11", label: "Semana 2 · 09 a 15/11" },
  { index: 2, start: "2026-11-16", end: "2026-11-22", range: "16 a 22/11", label: "Semana 3 · 16 a 22/11" },
  { index: 3, start: "2026-11-23", end: "2026-11-30", range: "23 a 30/11", label: "Semana 4 · 23 a 30/11" },
];

export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Índice da semana atual (0 a 3). Antes da campanha abre na 1ª, depois dela na última. */
export function currentWeekIndex(today: string = todayBR()): number {
  if (today < CAMPAIGN_WEEKS[0].start) return 0;
  const found = CAMPAIGN_WEEKS.find(w => today >= w.start && today <= w.end);
  return found ? found.index : CAMPAIGN_WEEKS.length - 1;
}

/** Datas da campanha (01 a 30/11) para seletores de período no formato brasileiro. */
export const CAMPAIGN_DAYS: string[] = Array.from({ length: 30 }, (_, i) => "2026-11-" + String(i + 1).padStart(2, "0"));
export const dayLabel = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);

export type AreaStatus = { tone: "good" | "bad" | "wait" | "none"; label: string; value?: string };

export type WeekPhase = "ended" | "current" | "future";
export function weekPhase(i: number, today: string = todayBR()): WeekPhase {
  const w = CAMPAIGN_WEEKS[i];
  return today > w.end ? "ended" : today >= w.start ? "current" : "future";
}
/** Texto para semana sem dado: substitui o "Pendente" genérico. */
export function noDataLabel(i: number, today: string = todayBR()): string {
  const p = weekPhase(i, today);
  return p === "ended" ? "Aguardando dados" : p === "current" ? "Em andamento" : "—";
}

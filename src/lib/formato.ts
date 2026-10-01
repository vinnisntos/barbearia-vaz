// Formatação de dinheiro e datas. Tudo no fuso de negócio (America/Sao_Paulo),
// independentemente do fuso do aparelho.

export const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(valor: number): string {
  return moeda.format(valor);
}

export function paraCentavos(reais: number): number {
  return Math.round(reais * 100);
}

export function formatarCentavos(centavos: number): string {
  return moeda.format(centavos / 100);
}

export function formatarDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// --- Datas "de calendário" (YYYY-MM-DD), sempre referentes a São Paulo ---

const partesData = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia (YYYY-MM-DD) em São Paulo para um instante (ISO ou epoch ms). */
export function diaEmSaoPaulo(instante: string | number): string {
  return partesData.format(new Date(instante));
}

/** Uma data de calendário como Date ao meio-dia UTC (só para formatar/somar). */
function comoUtc(dia: string): Date {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12));
}

export function somarDias(dia: string, quantidade: number): string {
  const data = comoUtc(dia);
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

export function somarMeses(mes: string, quantidade: number): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + quantidade, 1)).toISOString().slice(0, 7);
}

function formatadorDia(opcoes: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...opcoes });
}

const fmtSemanaCurta = formatadorDia({ weekday: "short" });
const fmtMesCurto = formatadorDia({ month: "short" });
const fmtDiaLongo = formatadorDia({ weekday: "long", day: "numeric", month: "long" });
const fmtMes = formatadorDia({ month: "long", year: "numeric" });
const fmtDiaCurto = formatadorDia({ day: "2-digit", month: "2-digit" });

const semPonto = (texto: string) => texto.replace(".", "");

/** "sex" */
export function semanaCurta(dia: string): string {
  return semPonto(fmtSemanaCurta.format(comoUtc(dia)));
}

/** "out" */
export function mesCurto(dia: string): string {
  return semPonto(fmtMesCurto.format(comoUtc(dia)));
}

export function numeroDoDia(dia: string): string {
  return String(Number(dia.slice(8, 10)));
}

/** "sexta-feira, 2 de outubro" */
export function formatarDiaLongo(dia: string): string {
  return fmtDiaLongo.format(comoUtc(dia));
}

/** "02/10" */
export function formatarDiaCurto(dia: string): string {
  return fmtDiaCurto.format(comoUtc(dia));
}

/** "outubro de 2026" */
export function formatarMes(mes: string): string {
  return fmtMes.format(comoUtc(`${mes}-01`));
}

// --- Instantes (ISO com offset) ---

const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});

/** "09:30" no horário de Brasília. */
export function formatarHora(iso: string): string {
  return fmtHora.format(new Date(iso));
}

/** "sexta-feira, 2 de outubro às 09:30" */
export function formatarDataHora(iso: string): string {
  return `${formatarDiaLongo(diaEmSaoPaulo(iso))} às ${formatarHora(iso)}`;
}

/** "09:59" a partir de milissegundos restantes. */
export function formatarContador(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

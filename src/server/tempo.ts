const fuso = 'America/Sao_Paulo';
const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: fuso,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export function partes(data: Date) {
  const p = Object.fromEntries(formatador.formatToParts(data).map((item) => [item.type, item.value]));
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
  };
}
export function localParaDate(dia: string, hora: string): Date {
  const [ano, mes, numero] = dia.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  const alvo = Date.UTC(ano, mes - 1, numero, h, m);
  let resultado = new Date(alvo + 3 * 3600000);
  for (let i = 0; i < 3; i++) {
    const p = partes(resultado);
    const atual = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto);
    resultado = new Date(resultado.getTime() + alvo - atual);
  }
  return resultado;
}
export function diaLocal(data: Date): string {
  const p = partes(data);
  return `${p.ano}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
}
export function isoLocal(data: Date): string {
  const p = partes(data);
  const utcLocal = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  const deslocamento = Math.round((utcLocal - data.getTime()) / 60000);
  const sinal = deslocamento >= 0 ? '+' : '-';
  const minutos = Math.abs(deslocamento);
  return `${diaLocal(data)}T${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}:${String(p.segundo).padStart(2, '0')}${sinal}${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}
export const centavos = (valor: number): number => Math.round(valor * 100);
export const reais = (valor: number): number => valor / 100;
export const sobrepoe = (a: string, b: string, c: string, d: string): boolean =>
  Date.parse(a) < Date.parse(d) && Date.parse(c) < Date.parse(b);
export function periodoMes(mes: string): [string, string] {
  const [ano, numero] = mes.split('-').map(Number);
  const inicio = localParaDate(`${ano}-${String(numero).padStart(2, '0')}-01`, '00:00');
  const fim = localParaDate(`${new Date(Date.UTC(ano, numero, 1)).toISOString().slice(0, 10)}`, '00:00');
  return [inicio.toISOString(), fim.toISOString()];
}

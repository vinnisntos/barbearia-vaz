// O POST /api/agendamentos devolve os dados do Pix/cartão, mas o GET não.
// Guardamos por id em sessionStorage para a página de checkout usar.

import type { DadosPagamento } from "./api";

const chave = (id: string) => `bv.pagamento.${id}`;
const chaveRedirecionado = (id: string) => `bv.redirecionado.${id}`;

export function guardarPagamento(id: string, pagamento: DadosPagamento): void {
  try {
    window.sessionStorage.setItem(chave(id), JSON.stringify(pagamento));
  } catch {
    // Storage bloqueado: o checkout mostra só status e contador.
  }
}

/** Texto bruto (estável entre leituras, serve de snapshot). */
export function lerPagamentoBruto(id: string): string | null {
  try {
    return window.sessionStorage.getItem(chave(id));
  } catch {
    return null;
  }
}

export function interpretarPagamento(bruto: string | null): DadosPagamento | null {
  if (!bruto) return null;
  try {
    const valor: unknown = JSON.parse(bruto);
    if (typeof valor !== "object" || valor === null) return null;
    const p = valor as Record<string, unknown>;
    if (
      p.forma === "PIX" &&
      typeof p.qrCodeBase64 === "string" &&
      typeof p.copiaECola === "string"
    ) {
      return { forma: "PIX", qrCodeBase64: p.qrCodeBase64, copiaECola: p.copiaECola };
    }
    if (p.forma === "CARTAO" && typeof p.urlCheckout === "string") {
      return { forma: "CARTAO", urlCheckout: p.urlCheckout };
    }
    return null;
  } catch {
    return null;
  }
}

/** Marca o redirecionamento ao checkout do cartão; devolve true só na 1ª vez. */
export function marcarRedirecionado(id: string): boolean {
  try {
    if (window.sessionStorage.getItem(chaveRedirecionado(id))) return false;
    window.sessionStorage.setItem(chaveRedirecionado(id), "1");
    return true;
  } catch {
    return false;
  }
}

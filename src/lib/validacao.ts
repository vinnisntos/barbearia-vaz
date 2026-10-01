// Máscaras e validações dos campos de formulário.

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** (11) 99999-8888 ou (11) 3333-4444, aplicada enquanto digita. */
export function mascararTelefone(texto: string): string {
  const d = soDigitos(texto).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function telefoneValido(texto: string): boolean {
  const d = soDigitos(texto);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  // Celular (11 dígitos) sempre começa com 9 depois do DDD.
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** 000.000.000-00, aplicada enquanto digita. */
export function mascararCpf(texto: string): string {
  const d = soDigitos(texto).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Valida os dois dígitos verificadores do CPF. */
export function cpfValido(texto: string): boolean {
  const d = soDigitos(texto);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const verificador = (tamanho: number): number => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(d[i]) * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return verificador(9) === Number(d[9]) && verificador(10) === Number(d[10]);
}

/** PIN de cancelamento: 4 caracteres alfanuméricos, em maiúsculas. */
export function mascararPin(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

/** Campo de dinheiro: o usuário digita só números e os centavos "empurram". */
export function centavosDigitados(texto: string): number {
  const d = soDigitos(texto).slice(0, 9);
  return d ? Number(d) : 0;
}

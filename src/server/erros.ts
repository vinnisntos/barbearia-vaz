export class ErroNegocio extends Error {
  constructor(
    public codigo: string,
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}
export const erro = (codigo: string, status: number, mensagem: string): never => {
  throw new ErroNegocio(codigo, status, mensagem);
};

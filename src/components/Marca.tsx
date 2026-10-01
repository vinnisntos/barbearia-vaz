import { Fragment } from "react";
import { partesDoNome } from "@/lib/site";

/** Nome da barbearia com o trecho de destaque em ouro. */
export function Marca() {
  return (
    <>
      {partesDoNome().map((parte, indice) => (
        <Fragment key={parte.texto}>
          {indice > 0 && " "}
          {parte.destaque ? <span className="text-ouro">{parte.texto}</span> : parte.texto}
        </Fragment>
      ))}
    </>
  );
}

import { Fragment } from "react";
import { partesDoNome } from "@/lib/site";

/** Nome da ótica com o trecho de destaque em amarelo. */
export function Marca() {
  return (
    <>
      {partesDoNome().map((parte, indice) => (
        <Fragment key={parte.texto}>
          {indice > 0 && " "}
          {parte.destaque ? <span className="text-amarelo">{parte.texto}</span> : parte.texto}
        </Fragment>
      ))}
    </>
  );
}

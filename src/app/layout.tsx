import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Montserrat } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.nome} — ${SITE.slogan}`,
    template: `%s · ${SITE.nome}`,
  },
  description: `Escolha o serviço, o dia e o horário e garanta sua vaga na ${SITE.nome}${SITE.cobraPagamento ? " pagando por Pix ou cartão" : ", sem custo para agendar"}.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#061127",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="faixa-marca" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

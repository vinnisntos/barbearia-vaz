import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Oswald } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.nome} — ${SITE.slogan}`,
    template: `%s · ${SITE.nome}`,
  },
  description: `Escolha o serviço, o dia e o horário e garanta sua vaga na ${SITE.nome} pagando por Pix ou cartão.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12100e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${oswald.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="faixa-barbeiro" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

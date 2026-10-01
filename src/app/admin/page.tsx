import type { Metadata } from "next";
import { Painel } from "@/components/admin/Painel";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false },
};

export default function PaginaAdmin() {
  return <Painel />;
}

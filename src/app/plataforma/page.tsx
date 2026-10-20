import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: { absolute: "EzerPro · Tu negocio digital, listo para vender" },
  description: "Software para negocios con tu marca y tu dirección web: pedidos, citas, ventas, cartera y más. Prueba un demo de tu nicho sin registrarte.",
  robots: { index: true, follow: true },
  openGraph: { title: "EzerPro · Tu negocio digital", description: "Elige tu nicho, pruébalo sin registrarte y lo dejamos con tu marca.", images: ["/landing/logo-full.webp"] },
};

export default function Page() {
  return <LandingPage />;
}

import type { Metadata } from "next";
import { TallerOrderPage } from "@/components/taller-order-page";

export const metadata: Metadata = { title: "Seguimiento de tu orden", robots: { index: false } };

export default function Page() {
  return <TallerOrderPage />;
}

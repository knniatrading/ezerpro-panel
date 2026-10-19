import type { Metadata } from "next";
import { TallerOrderView } from "@/components/taller-order";

export const metadata: Metadata = { title: "Orden de servicio" };

export default function Page() {
  return <TallerOrderView />;
}

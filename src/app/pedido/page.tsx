import type { Metadata } from "next";
import { FerreOrderPage } from "@/components/ferre-order-page";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

export default function Page() {
  return <FerreOrderPage />;
}

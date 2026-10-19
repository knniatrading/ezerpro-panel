import type { Metadata } from "next";
import { FerreSalesView } from "@/components/ferre-sales";

export const metadata: Metadata = { title: "Ventas de mostrador" };

export default function Page() {
  return <FerreSalesView />;
}

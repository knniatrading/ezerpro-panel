import type { Metadata } from "next";
import { FerrePosView } from "@/components/ferre-pos";

export const metadata: Metadata = { title: "Punto de venta" };

export default function Page() {
  return <FerrePosView />;
}

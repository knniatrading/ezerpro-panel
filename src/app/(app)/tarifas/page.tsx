import type { Metadata } from "next";
import { RatesView } from "@/components/driver-rates";

export const metadata: Metadata = { title: "Tarifas y servicios" };

export default function Page() {
  return <RatesView />;
}

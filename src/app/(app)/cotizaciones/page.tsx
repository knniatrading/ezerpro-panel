import type { Metadata } from "next";
import { FerreQuotesView } from "@/components/ferre-quotes";

export const metadata: Metadata = { title: "Cotizaciones" };

export default function Page() {
  return <FerreQuotesView />;
}

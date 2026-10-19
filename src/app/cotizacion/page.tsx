import type { Metadata } from "next";
import { FerreQuotePage } from "@/components/ferre-quote-page";

export const metadata: Metadata = { title: "Cotización", robots: { index: false } };

export default function Page() {
  return <FerreQuotePage />;
}

import type { Metadata } from "next";
import { ResVisitPage } from "@/components/res-public";

export const metadata: Metadata = { title: "Pase de visita" };

export default function Page() {
  return <ResVisitPage />;
}

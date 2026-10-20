import type { Metadata } from "next";
import { ResTicketsView } from "@/components/res-tickets";

export const metadata: Metadata = { title: "PQRS" };

export default function Page() {
  return <ResTicketsView />;
}

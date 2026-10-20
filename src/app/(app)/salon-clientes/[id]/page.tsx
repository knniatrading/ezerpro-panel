import type { Metadata } from "next";
import { SalonClientView } from "@/components/salon-clients";

export const metadata: Metadata = { title: "Cliente" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SalonClientView id={id} />;
}

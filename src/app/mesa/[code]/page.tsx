import type { Metadata } from "next";
import { TableOrder } from "@/components/table-order";

export const metadata: Metadata = { title: "Pedir en la mesa" };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TableOrder code={code} />;
}

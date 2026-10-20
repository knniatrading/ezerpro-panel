import type { Metadata } from "next";
import { ResAssemblyView } from "@/components/res-assembly";

export const metadata: Metadata = { title: "Asamblea" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResAssemblyView id={id} />;
}

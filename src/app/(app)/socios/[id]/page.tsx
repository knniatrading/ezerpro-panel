import type { Metadata } from "next";
import { GymMemberView } from "@/components/gym-member";

export const metadata: Metadata = { title: "Ficha del socio" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GymMemberView id={id} />;
}

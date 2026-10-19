import type { Metadata } from "next";
import { GymMembersView } from "@/components/gym-members";

export const metadata: Metadata = { title: "Socios" };

export default function Page() {
  return <GymMembersView />;
}

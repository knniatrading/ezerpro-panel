import type { Metadata } from "next";
import { CardAdminView } from "@/components/driver-card-admin";

export const metadata: Metadata = { title: "Mi tarjeta y QR" };

export default function Page() {
  return <CardAdminView />;
}

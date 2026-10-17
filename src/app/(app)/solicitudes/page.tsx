import type { Metadata } from "next";
import { RequestsView } from "@/components/driver-requests";

export const metadata: Metadata = { title: "Solicitudes" };

export default function Page() {
  return <RequestsView />;
}

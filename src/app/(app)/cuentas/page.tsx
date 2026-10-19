import type { Metadata } from "next";
import { FerreAccountsView } from "@/components/ferre-accounts";

export const metadata: Metadata = { title: "Cuentas por cobrar" };

export default function Page() {
  return <FerreAccountsView />;
}

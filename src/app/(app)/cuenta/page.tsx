import type { Metadata } from "next";
import { AccountView } from "@/components/account-view";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function AccountPage() {
  return <AccountView />;
}

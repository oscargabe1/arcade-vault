import type { Metadata } from "next";
import { Library } from "@/components/library";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
};

export default function Home() {
  return <Library />;
}

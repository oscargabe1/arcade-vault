import type { Metadata } from "next";
import { Home } from "@/components/home";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
};

export default function HomePage() {
  return <Home />;
}

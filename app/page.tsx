import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getGames } from "@/lib/games";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
};

export default async function HomePage() {
  const games = await getGames();
  return <Home games={games} />;
}

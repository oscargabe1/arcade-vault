import type { Metadata } from "next";
import { HallOfFame } from "@/components/hall-of-fame";
import type { ScoreRow } from "@/lib/data";
import { getGames, getHallOfFame } from "@/lib/games";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};

export default async function HallOfFamePage() {
  const games = await getGames();
  let scores: Record<string, ScoreRow[]> | null;
  try {
    scores = await getHallOfFame(12);
  } catch {
    scores = null;
  }
  return <HallOfFame games={games} scores={scores} />;
}

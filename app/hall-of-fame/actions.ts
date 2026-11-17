"use server";

import type { ScoreRow } from "@/lib/data";
import { formatDate } from "@/lib/games";
import { createPublicClient } from "@/lib/supabase/public";

export async function getPlayerBestAction(gameId: string, name: string): Promise<ScoreRow | null> {
  if (typeof gameId !== "string" || typeof name !== "string" || !name) return null;

  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("*")
    .eq("game_id", gameId)
    .eq("player_name", name)
    .maybeSingle();
  if (error || !data) return null;

  return {
    rank: data.rank ?? 0,
    name: data.player_name ?? name,
    score: data.best_score ?? 0,
    date: formatDate(data.achieved_at),
  };
}

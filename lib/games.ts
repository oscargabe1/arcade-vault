import { cacheTag } from "next/cache";
import type { Category, Game, GameStats, ScoreRow } from "@/lib/data";
import type { Database } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type LeaderboardRow = Database["public"]["Views"]["leaderboard"]["Row"];

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short_desc,
    long: row.long_desc,
    cat: row.category as Category,
    cover: row.cover,
    color: row.color as Game["color"],
  };
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function toScoreRow(row: LeaderboardRow): ScoreRow {
  return {
    rank: row.rank ?? 0,
    name: row.player_name ?? "",
    score: row.best_score ?? 0,
    date: formatDate(row.achieved_at),
  };
}

export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheTag("games");
  const { data, error } = await createPublicClient()
    .from("games")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`getGames: ${error.message}`);
  return data.map(toGame);
}

export async function getGame(id: string): Promise<Game | null> {
  "use cache";
  cacheTag("games");
  const { data, error } = await createPublicClient()
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getGame: ${error.message}`);
  return data ? toGame(data) : null;
}

export async function getGameStats(id: string): Promise<GameStats> {
  "use cache";
  cacheTag(`scores:${id}`);
  const supabase = createPublicClient();
  const [{ count, error: countError }, { data, error: bestError }] =
    await Promise.all([
      supabase
        .from("scores")
        .select("id", { count: "exact", head: true })
        .eq("game_id", id),
      supabase
        .from("scores")
        .select("score")
        .eq("game_id", id)
        .order("score", { ascending: false })
        .limit(1),
    ]);
  if (countError || bestError) {
    throw new Error(`getGameStats: ${(countError ?? bestError)!.message}`);
  }
  return { best: data[0]?.score ?? 0, plays: count ?? 0 };
}

export async function getLeaderboard(
  id: string,
  limit: number,
): Promise<ScoreRow[]> {
  "use cache";
  cacheTag(`scores:${id}`);
  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("*")
    .eq("game_id", id)
    .order("best_score", { ascending: false })
    .order("achieved_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getLeaderboard: ${error.message}`);
  return data.map(toScoreRow);
}

export async function getHallOfFame(
  limit: number,
): Promise<Record<string, ScoreRow[]>> {
  "use cache";
  cacheTag("scores");
  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("*")
    .order("best_score", { ascending: false })
    .order("achieved_at", { ascending: true });
  if (error) throw new Error(`getHallOfFame: ${error.message}`);
  const byGame: Record<string, ScoreRow[]> = {};
  for (const row of data) {
    if (!row.game_id) continue;
    const list = (byGame[row.game_id] ??= []);
    if (list.length < limit) list.push(toScoreRow(row));
  }
  return byGame;
}

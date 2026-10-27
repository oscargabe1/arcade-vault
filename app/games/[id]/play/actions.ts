"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SaveScoreResult = { ok: true } | { ok: false; error: string };

const MAX_SCORE = 10_000_000;

export async function saveScoreAction(gameId: string, name: string, score: number): Promise<SaveScoreResult> {
  if (typeof gameId !== "string" || !gameId) return { ok: false, error: "JUEGO NO VÁLIDO" };
  if (typeof name !== "string" || name.length < 1 || name.length > 10) {
    return { ok: false, error: "NOMBRE NO VÁLIDO" };
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "PUNTUACIÓN NO VÁLIDA" };
  }

  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase.from("games").select("id").eq("id", gameId).maybeSingle();
  if (gameError) return { ok: false, error: "NO SE PUDO GUARDAR" };
  if (!game) return { ok: false, error: "JUEGO NO VÁLIDO" };

  const { error } = await supabase.from("scores").insert({ game_id: gameId, player_name: name, score });
  if (error) return { ok: false, error: "NO SE PUDO GUARDAR" };

  updateTag(`scores:${gameId}`);
  updateTag("scores");
  return { ok: true };
}

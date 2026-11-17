import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { getGame, getGames } from "@/lib/games";

export async function generateStaticParams() {
  return (await getGames()).map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/games/[id]/play">): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id);
  return { title: game ? `Jugando ${game.title} · Arcade Vault` : "Juego no encontrado · Arcade Vault" };
}

export default function PlayPage({ params }: PageProps<"/games/[id]/play">) {
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: Pick<PageProps<"/games/[id]/play">, "params">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}

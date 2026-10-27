"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getPlayerBestAction } from "@/app/hall-of-fame/actions";
import { useSession } from "@/components/session-provider";
import type { Game, ScoreRow } from "@/lib/data";

const EMPTY_SLOT: ScoreRow = { rank: 0, name: "---", score: 0, date: "" };

export function HallOfFame({ games, scores }: { games: Game[]; scores: Record<string, ScoreRow[]> | null }) {
  const { user } = useSession();
  const [tab, setTab] = useState(games[0].id);
  const [youBest, setYouBest] = useState<{ key: string; row: ScoreRow | null } | null>(null);
  const [, startTransition] = useTransition();
  const rows = scores?.[tab] ?? [];
  const game = games.find((g) => g.id === tab) ?? games[0];
  const podium = [0, 1, 2].map((i) => rows[i] ?? EMPTY_SLOT);
  const fmt = (r: ScoreRow) => (r === EMPTY_SLOT ? "---" : r.score.toLocaleString("es-ES"));

  const userName = user?.name ?? null;
  const youKey = userName ? `${tab}:${userName}` : null;
  const you = youBest && youBest.key === youKey ? youBest.row : null;

  useEffect(() => {
    if (!userName || !youKey) return;
    let cancelled = false;
    startTransition(async () => {
      const row = await getPlayerBestAction(tab, userName);
      if (!cancelled) startTransition(() => setYouBest({ key: youKey, row }));
    });
    return () => {
      cancelled = true;
    };
  }, [tab, userName, youKey]);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button key={g.id} className={"chip" + (tab === g.id ? " active" : "")} onClick={() => setTab(g.id)}>
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{podium[1].name}</div>
          <div className="score">{fmt(podium[1])}</div>
          <div className="date">{podium[1].date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{podium[0].name}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {fmt(podium[0])}
          </div>
          <div className="date">{podium[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{podium[2].name}</div>
          <div className="score">{fmt(podium[2])}</div>
          <div className="date">{podium[2].date}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {scores === null && <div className="lb-empty">NO SE PUDO CARGAR</div>}
        {scores !== null && rows.length === 0 && <div className="lb-empty">SIN PUNTAJES AÚN — SÉ EL PRIMERO</div>}
        {rows.map((r, i) => (
          <div
            key={r.name + i}
            className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {user && you && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
              <div className="rk" style={{ color: "var(--yellow)" }}>
                #{String(you.rank).padStart(2, "0")}
              </div>
              <div className="pl" style={{ color: "var(--yellow)" }}>
                {you.name}
              </div>
              <div className="sc" style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}>
                {you.score.toLocaleString("es-ES")}
              </div>
              <div className="dt">{you.date}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

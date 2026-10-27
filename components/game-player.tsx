"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { saveScoreAction } from "@/app/games/[id]/play/actions";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import { useSession } from "@/components/session-provider";
import type { Game } from "@/lib/data";

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [runKey, setRunKey] = useState(0);
  const name = user?.name ?? "INVITADO";
  // Solo asteroids tiene motor real; el resto sigue en mock.
  const real = game.id === "asteroids";

  useEffect(() => {
    if (real || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [real, over, paused]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!real && score > 0 && score % 2500 < 100) setLevel((l) => l + 1);
  }, [real, score]);

  const endGame = () => setOver(true);
  const save = () => {
    if (!user) return;
    setSaveError(null);
    startSaving(async () => {
      const res = await saveScoreAction(game.id, user.name, score);
      startSaving(() => {
        if (res.ok) setSaved(true);
        else setSaveError(res.error);
      });
    });
  };
  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
    setRunKey((k) => k + 1);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={(e) => {
              e.currentTarget.blur();
              setPaused((p) => !p);
            }}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            className="btn magenta"
            onClick={(e) => {
              e.currentTarget.blur();
              endGame();
            }}
          >
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {real ? (
            <AsteroidsCanvas
              key={runKey}
              active={!paused && !over}
              onScore={setScore}
              onLives={setLives}
              onLevel={setLevel}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {saved ? (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            ) : user ? (
              <>
                <div className="input-row">
                  <input value={user.name} readOnly aria-label="Jugador" />
                  <button className="btn yellow" onClick={save} disabled={saving}>
                    {saving ? "GUARDANDO…" : saveError ? "REINTENTAR" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveError && (
                  <div className="pixel" style={{ fontSize: 10, color: "var(--magenta)", marginTop: 10 }}>
                    ▸ {saveError}
                  </div>
                )}
              </>
            ) : (
              <div className="pixel" style={{ fontSize: 10, marginTop: 10, letterSpacing: "0.1em" }}>
                <Link href="/auth" className="neon-cyan">
                  INICIA SESIÓN PARA GUARDAR
                </Link>
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import {
  createAsteroids,
  type AsteroidsCallbacks,
  type AsteroidsGame,
} from "@/lib/games/asteroids/engine";

type Props = AsteroidsCallbacks & { active: boolean }; // active = !paused && !over

export function AsteroidsCanvas({
  active,
  onScore,
  onLives,
  onLevel,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  // latest-ref: el motor se crea una vez y siempre llama a los callbacks más recientes
  const cbRef = useRef<AsteroidsCallbacks>({
    onScore,
    onLives,
    onLevel,
    onGameOver,
  });

  useEffect(() => {
    cbRef.current = { onScore, onLives, onLevel, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createAsteroids(canvas, {
      onScore: (s) => cbRef.current.onScore(s),
      onLives: (l) => cbRef.current.onLives(l),
      onLevel: (l) => cbRef.current.onLevel(l),
      onGameOver: (s) => cbRef.current.onGameOver(s),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    gameRef.current?.setPaused(!active);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

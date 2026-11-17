"use client";

import { useEffect, useRef } from "react";
import type { GameCallbacks, GameFactory, GameHandle } from "@/lib/games/types";

type Props = GameCallbacks & {
  factory: GameFactory;
  width: number;
  height: number;
  active: boolean; // !paused && !over
};

export function GameCanvas({
  factory,
  width,
  height,
  active,
  onScore,
  onLives,
  onLevel,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  // latest-ref: el motor se crea una vez y siempre llama a los callbacks más recientes
  const cbRef = useRef<GameCallbacks>({
    onScore,
    onLives,
    onLevel,
    onGameOver,
  });
  const factoryRef = useRef(factory);

  useEffect(() => {
    cbRef.current = { onScore, onLives, onLevel, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = factoryRef.current(canvas, {
      onScore: (s) => cbRef.current.onScore(s),
      onLives: (l) => cbRef.current.onLives?.(l),
      onLevel: (l) => cbRef.current.onLevel?.(l),
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
      width={width}
      height={height}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

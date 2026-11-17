// ===== registry.ts — juegos con motor real; el resto del catálogo sigue en mock =====

import { createAsteroids } from "./asteroids/engine";
import type { GameFactory } from "./types";

export type RealGame = {
  factory: GameFactory;
  width: number;
  height: number;
  hud: { lives: boolean; level: boolean };
  initial: { lives: number; level: number };
};

export const REAL_GAMES: Record<string, RealGame> = {
  asteroids: {
    factory: createAsteroids,
    width: 800,
    height: 600,
    hud: { lives: true, level: true },
    initial: { lives: 3, level: 1 },
  },
};

// ===== types.ts — contrato común entre la plataforma y los motores de juegos reales =====

export type GameCallbacks = {
  onScore: (score: number) => void;
  onLives?: (lives: number) => void;
  onLevel?: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type GameHandle = {
  setPaused: (paused: boolean) => void; // congela update; el último frame sigue visible
  destroy: () => void; // cancela rAF y quita listeners
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
) => GameHandle;

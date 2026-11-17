// ===== data.ts — shared types and constants =====

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string; // clase CSS, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
};
export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};
export type GameStats = { best: number; plays: number };
export type SessionUser = { name: string }; // localStorage "av_user" (JSON | null)

export const CATS: ("TODOS" | Category)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

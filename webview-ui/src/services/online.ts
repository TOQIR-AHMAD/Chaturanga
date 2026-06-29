import type { SavedGame } from "../types";
import { importPgn } from "./chess-core";

export interface RemoteProfile {
  username: string;
  title?: string;
  ratingSummary: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildSavedGame(name: string, mode: string, pgn: string): SavedGame {
  const parsed = importPgn(pgn);
  const timestamp = new Date().toISOString();
  return {
    id: `${mode}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    mode,
    pgn,
    fen: parsed.fen,
    createdAt: timestamp,
    updatedAt: timestamp,
    result: "*",
    opening: undefined,
    initialFen: parsed.initialFen,
    moves: parsed.moves,
    cursor: parsed.cursor,
    orientation: "white",
    whiteMs: 600000,
    blackMs: 600000,
    difficulty: "intermediate",
    computerColor: "b"
  };
}

export async function fetchChessComProfile(username: string): Promise<RemoteProfile> {
  const profile = await fetchJson<{ username: string; status?: string; name?: string }>(
    `https://api.chess.com/pub/player/${username}`
  );
  const stats = await fetchJson<Record<string, { last?: { rating?: number } }>>(
    `https://api.chess.com/pub/player/${username}/stats`
  );
  const ratings = Object.entries(stats)
    .filter(([, value]) => value?.last?.rating)
    .map(([key, value]) => `${key}: ${value.last?.rating}`)
    .join(" - ");

  return {
    username: profile.username,
    title: profile.status ?? profile.name,
    ratingSummary: ratings || "No public ratings"
  };
}

export async function importChessComGames(username: string): Promise<SavedGame[]> {
  const archives = await fetchJson<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${username}/games/archives`
  );
  const latest = archives.archives.at(-1);
  if (!latest) {
    return [];
  }
  const month = await fetchJson<{ games: Array<{ pgn: string; white: { username: string }; black: { username: string } }> }>(latest);
  return month.games.slice(0, 12).map((game, index) =>
    buildSavedGame(
      `${username} archive ${index + 1}`,
      "analysis",
      game.pgn
    )
  );
}

export async function fetchLichessProfile(username: string): Promise<RemoteProfile> {
  const profile = await fetchJson<{
    username: string;
    title?: string;
    perfs?: Record<string, { rating?: number }>;
  }>(`https://lichess.org/api/user/${username}`);
  const ratingSummary = Object.entries(profile.perfs ?? {})
    .filter(([, perf]) => perf.rating)
    .slice(0, 4)
    .map(([key, perf]) => `${key}: ${perf.rating}`)
    .join(" - ");
  return {
    username: profile.username,
    title: profile.title,
    ratingSummary: ratingSummary || "No public ratings"
  };
}

export async function importLichessGames(username: string): Promise<SavedGame[]> {
  const response = await fetch(
    `https://lichess.org/api/games/user/${username}?max=10&pgnInJson=true`,
    {
      headers: {
        Accept: "application/x-ndjson"
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line, index) => JSON.parse(line) as { pgn: string })
    .map((game, index) => buildSavedGame(`${username} lichess ${index + 1}`, "analysis", game.pgn));
}

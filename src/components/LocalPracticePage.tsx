import {
  applyMove,
  createInitialGameState,
  FEMN,
  GameState,
  Move,
} from "../../lib/chessmerge";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChessGame } from "./ChessGame";
import { useCallback, useMemo } from "react";

const defaultGameState = createInitialGameState();

export function LocalPracticePage() {
  const serializedGameState = useSearch({
    from: "/practice",
    select: (search) => search.gameState,
  });
  const navigate = useNavigate({ from: "/practice" });
  const gameState = useMemo(
    () => parseGameState(serializedGameState),
    [serializedGameState],
  );

  const setGameState = useCallback(
    async (nextGameState: GameState) => {
      await navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          gameState: FEMN.toFEMNGame(nextGameState, "_"),
        }),
      });
    },
    [navigate],
  );

  const makeMove = useCallback(
    async (move: Move) => {
      const newGameState = applyMove(gameState, move);
      await setGameState(newGameState);
    },
    [gameState, setGameState],
  );

  return (
    <ChessGame
      gameStatus={"active"}
      isBlackPlayer={true}
      isMyTurn={true}
      setPracticeGameState={setGameState}
      gameState={gameState}
      isPracticeGame={true}
      makeMove={makeMove}
      renderedGameInfo={null}
    />
  );
}

function parseGameState(serializedGameState: string | undefined): GameState {
  if (!serializedGameState) {
    return defaultGameState;
  }

  try {
    return FEMN.fromFEMNGame(serializedGameState);
  } catch {
    return defaultGameState;
  }
}

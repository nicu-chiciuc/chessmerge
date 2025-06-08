import {
  applyMove,
  createInitialGameState,
  FEMN,
  GameState,
  Move,
} from "../../lib/chessmerge";
import { useQueryState } from "nuqs";
import { ChessGame } from "./ChessGame";
import { useCallback } from "react";

const defaultGameState = createInitialGameState();

export function LocalPracticePage() {
  // store game state in query params
  const [gameState, setGameState] = useQueryState<GameState>("gameState", {
    defaultValue: defaultGameState,
    clearOnDefault: false,
    parse: (femn: string) => {
      return FEMN.fromFEMNGame(femn);
    },

    serialize: (gameState: GameState) => {
      return FEMN.toFEMNGame(gameState, "_");
    },
  });

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

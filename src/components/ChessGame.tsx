/* eslint-disable @typescript-eslint/no-misused-promises */
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { ChessBoard } from "./ChessBoard";
import { GameInfo } from "./GameInfo";
import { EmailSubscribe } from "./EmailSubscribe";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getAllMovesForCell } from "../../lib/chessmerge";
import type {
  GameState,
  MergedPieceTypes,
  Move,
  Piece,
  Position,
} from "../../lib/chessmerge";
import { toast } from "sonner";

type GameView = NonNullable<FunctionReturnType<typeof api.gameLogic.getGame>>;

export function ChessGameWrapper({ game }: { game: GameView }) {
  const gameId = game._id;
  const makeMoveApi = useMutation(api.gameLogic.makeMove);
  const resignGameApi = useMutation(api.gameLogic.resignGame);

  const makeMove = useCallback(
    async (move: Move) => {
      await makeMoveApi({ gameId, move: JSON.stringify(move) });
    },
    [gameId, makeMoveApi],
  );

  const resignGame = useCallback(async () => {
    await resignGameApi({ gameId });
  }, [gameId, resignGameApi]);

  const gameState = useMemo(() => {
    return JSON.parse(game.gameState);
  }, [game.gameState]);
  const winner = game.status === "completed" ? game.winner : undefined;
  const gameEndReason =
    game.status === "completed" ? game.gameEndReason : undefined;

  useEffect(() => {
    if (gameEndReason === "checkmate") {
      toast.success(`Checkmate! ${winner === "w" ? "White" : "Black"} wins!`);
    } else if (gameEndReason === "stalemate") {
      toast.info("Stalemate! Game is a draw.");
    } else if (gameEndReason === "resignation") {
      if (game.playerColor === null) {
        toast.info(`${winner === "w" ? "White" : "Black"} won by resignation.`);
      } else if (winner === game.playerColor) {
        toast.success("Your opponent resigned. You won.");
      } else {
        toast.info("You resigned.");
      }
    }
  }, [game.playerColor, gameEndReason, winner]);

  const isMyTurn = gameState.options.turn === game.playerColor;
  const isBlackPlayer = game.playerColor === "b";

  return (
    <ChessGame
      gameStatus={game.status}
      gameState={gameState}
      makeMove={makeMove}
      isMyTurn={game.status === "active" && isMyTurn}
      isBlackPlayer={isBlackPlayer}
      readOnly={game.playerColor === null || game.status !== "active"}
      renderedGameInfo={
        <div className="flex-1 space-y-4">
          <GameInfo
            game={game}
            gameState={gameState}
            onResign={game.playerColor === null ? undefined : resignGame}
            playerColor={game.playerColor}
          />
        </div>
      }
    />
  );
}

export function ChessGame({
  gameStatus,
  gameState,
  makeMove,
  isMyTurn,
  isBlackPlayer,
  readOnly,
  renderedGameInfo,
}: {
  isBlackPlayer: boolean;
  readOnly: boolean;
  gameStatus: GameView["status"];
  gameState: GameState;
  makeMove: (move: Move) => Promise<unknown>;
  isMyTurn: boolean;
  renderedGameInfo: React.ReactNode;
}) {
  const [selectedSquare, raw_setSelectedSquare] = useState<Position | null>(
    null,
  );
  const [selectedPieceMode, setSelectedPieceMode] = useState<
    "both" | "first" | "second"
  >("both");

  const [needsPromotion, setNeedsPromotion] = useState<Move | null>(null);

  const setSelectedSquare = useCallback(
    (square: Position | null) => {
      raw_setSelectedSquare(square);
      setSelectedPieceMode("both");
    },
    [raw_setSelectedSquare],
  );

  const executeMove = useCallback(
    async (move: Move) => {
      try {
        await makeMove(move);
      } catch {
        toast.error("Invalid move");
      }
    },
    [makeMove],
  );

  const setSelectedPromotion = useCallback(
    async (piece: Piece) => {
      if (!needsPromotion) return;

      needsPromotion.promotion = piece.pieceType;

      await executeMove(needsPromotion);

      setNeedsPromotion(null);
      setSelectedSquare(null);
    },
    [executeMove, needsPromotion, setSelectedSquare],
  );

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];

    const selectedCell =
      gameState.board[selectedSquare.row][selectedSquare.col];
    let newValidMoves: Move[] = [];

    const allMoves = getAllMovesForCell(selectedSquare, gameState);

    if (selectedCell.length < 2) {
      return allMoves;
    }

    if (selectedPieceMode === "both") {
      newValidMoves = allMoves.filter((move) => move.piece.length === 2);
    } else if (selectedPieceMode === "first" && selectedCell.length >= 1) {
      newValidMoves = allMoves.filter(
        (move) =>
          move.piece.length === 1 && move.piece === selectedCell[0].pieceType,
      );
    } else if (selectedPieceMode === "second" && selectedCell.length === 2) {
      newValidMoves = allMoves.filter(
        (move) =>
          move.piece.length === 1 && move.piece === selectedCell[1].pieceType,
      );
    }

    return newValidMoves;
  }, [selectedPieceMode, selectedSquare, gameState]);

  const handlePieceSelectionChange = (mode: "both" | "first" | "second") => {
    setSelectedPieceMode(mode);
  };

  const handleSquareClick = async (row: number, col: number) => {
    setNeedsPromotion(null);
    if (!isMyTurn || gameStatus !== "active") return;

    const clickedCell = gameState.board[row][col];
    const position = { row, col };

    if (selectedSquare) {
      // Try to make a move
      const targetMove = validMoves.find(
        (move) => move.to.row === row && move.to.col === col,
      );
      const selectedCell =
        gameState.board[selectedSquare.row][selectedSquare.col];

      if (targetMove) {
        if (selectedPieceMode === "both" && selectedCell.length === 2) {
          targetMove.piece =
            `${selectedCell[0].pieceType}${selectedCell[1].pieceType}` as MergedPieceTypes;
        }

        if (targetMove.isPromotion) {
          setNeedsPromotion(targetMove);

          return;
        }

        await executeMove(targetMove);

        setSelectedSquare(null);
        return;
      }
    }

    if (
      clickedCell.length > 0 &&
      clickedCell[0].color === gameState.options.turn
    ) {
      // Select cell and get all possible moves
      setSelectedSquare(position);
      return;
    }

    setSelectedSquare(null);
  };

  // Convert Move[] to Position[] for ChessBoard component compatibility
  const validPositions: Position[] = validMoves.map((move) => move.to);

  return (
    <div className="mt-4 flex flex-col xl:grid xl:grid-cols-4 gap-4 xl:gap-6">
      <div className="w-full max-w-3xl xl:col-span-3 mx-auto">
        <ChessBoard
          board={gameState.board}
          selectedSquare={selectedSquare}
          validMoves={validPositions}
          // fullMoves={validMoves}
          // unmergePositions={unmergePositions}
          onSquareClick={handleSquareClick}
          onPieceSelectionChange={handlePieceSelectionChange}
          flipped={isBlackPlayer}
          isMyTurn={!!isMyTurn}
          currentTurn={gameState.options.turn}
          needsPromotion={needsPromotion ? needsPromotion.to : null}
          setSelectedPromotion={setSelectedPromotion}
          readOnly={readOnly}
        />
      </div>

      <div className="flex flex-col sm:flex-row xl:flex-col gap-4 xl:gap-6">
        {renderedGameInfo}

        {/* <div className="flex-1">
          <MoveHistory moves={moveHistory} />
        </div> */}
        <div className="flex-1">
          <EmailSubscribe compact />
        </div>
      </div>
    </div>
  );
}

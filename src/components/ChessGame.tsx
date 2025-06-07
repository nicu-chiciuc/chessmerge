/* eslint-disable @typescript-eslint/no-misused-promises */
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ChessBoard } from "./ChessBoard";
import { GameInfo } from "./GameInfo";
import { EmailSubscribe } from "./EmailSubscribe";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FEMN,
  GameState,
  MergedPieceTypes,
  Move,
  Position,
  boardToString,
  formatPosition,
  getAllMovesForCell,
} from "../../lib/chessmerge";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface ChessGameProps {
  gameId: Id<"games">;
}

function useEditOnFocus({
  logName,
  serverState,
  setServerState,
}: {
  logName?: string;
  serverState: string;
  setServerState: (strBoard: string) => Promise<unknown>;
}) {
  const [editingState, setEditingState] = useState(false);
  const [localState, setLocalState] = useState("");

  const setLocaleState = useCallback(
    async (strBoard: string) => {
      console.log(`triggered ${logName}`);
      setEditingState(true);
      setLocalState(strBoard);

      try {
        await setServerState(strBoard);
      } catch (error) {
        console.error(error);
      }
    },
    [logName, setServerState],
  );

  const onBlur = useCallback(() => {
    setEditingState(false);
  }, []);

  const state = useMemo(() => {
    return editingState ? localState : serverState;
  }, [editingState, localState, serverState]);

  return useMemo(() => {
    return [state, setLocaleState, onBlur] as const;
  }, [state, setLocaleState, onBlur]);
}

function GameControls({
  gameId,
  gameState,
}: {
  gameId: Id<"games">;
  gameState: GameState;
}) {
  const setPracticeGameState = useMutation(api.gameLogic.setPracticeGameState);

  const [arrayBoard, setLocaleArrayBoard, onBlurArrayBoard] = useEditOnFocus({
    logName: "Array",
    serverState: boardToString(gameState.board),
    setServerState: async (arrayStringBoard) => {
      await setPracticeGameState({ gameId, strBoard: arrayStringBoard });
    },
  });

  const [femnBoard, setLocaleFemnBoard, onBlurFemnBoard] = useEditOnFocus({
    logName: "FEMN",
    serverState: FEMN.toFEMNGame(gameState),
    setServerState: async (femn) => {
      const strBoard = FEMN.fromFEMNGame(femn);
      await setPracticeGameState({
        gameId,
        strBoard: boardToString(strBoard.board),
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="font-bold text-xs">FEMN</span>
        <Textarea
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={femnBoard}
          onBlur={onBlurFemnBoard}
          onChange={(e) => setLocaleFemnBoard(e.target.value)}
          className="font-mono resize-none w-full overflow-hidden"
        />
        <div className="h-4" />

        {/* 
        Add checkboxes to trigger casling rights, with labels for each
         */}
        <div className="flex flex-row gap-2">
          <Checkbox id="white-short-castle" />
        </div>

        {/*
          Textarea is monospace, no autocorrect, no spellcheck, no resize 
          should contain all text without need to scroll
          Width should contain exactly 8*3 (24) characters plus 2 so it doesn't wrap
        NEVER has a scrollbar
        */}
        <span className="font-bold text-xs">String array</span>

        <Textarea
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          rows={8}
          onBlur={onBlurArrayBoard}
          value={arrayBoard}
          className="font-mono resize-none w-[26ch] overflow-hidden text-nowrap"
          onChange={(e) => setLocaleArrayBoard(e.target.value)}
        />
      </CardContent>
    </Card>
  );
}

export function ChessGame({ gameId }: ChessGameProps) {
  const game = useQuery(api.gameLogic.getGame, { gameId });
  const makeMove = useMutation(api.gameLogic.makeMove);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const [selectedSquare, raw_setSelectedSquare] = useState<Position | null>(
    null,
  );
  const [selectedPieceMode, setSelectedPieceMode] = useState<
    "both" | "first" | "second"
  >("both");

  const setSelectedSquare = useCallback(
    (square: Position | null) => {
      raw_setSelectedSquare(square);
      setSelectedPieceMode("both");
    },
    [raw_setSelectedSquare],
  );

  // Parse board directly - expect new format only
  const gameState: GameState = game
    ? JSON.parse(game.gameState)
    : Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );

  const isWhitePlayer = game?.whitePlayerId === loggedInUser?._id;
  const isBlackPlayer = game?.blackPlayerId === loggedInUser?._id;

  // For practice games, user can play both sides, otherwise enforce turn order
  const isMyTurn =
    game &&
    (game.isPracticeGame
      ? isWhitePlayer || isBlackPlayer
      : (gameState.options.turn === "w" && isWhitePlayer) ||
        (gameState.options.turn === "b" && isBlackPlayer));

  useEffect(() => {
    if (game?.status === "completed") {
      if (game.gameEndReason === "checkmate") {
        toast.success(
          `Checkmate! ${game.winner === "w" ? "White" : "Black"} wins!`,
        );
      } else if (game.gameEndReason === "stalemate") {
        toast.info("Stalemate! Game is a draw.");
      }
    }
  }, [game?.status, game?.gameEndReason, game?.winner]);

  const validMoves = useMemo(() => {
    console.log("recalculated");
    if (!selectedSquare) return [];

    const selectedCell =
      gameState.board[selectedSquare.row][selectedSquare.col];
    let newValidMoves: Move[] = [];

    const allMoves = getAllMovesForCell(selectedSquare, gameState);

    console.log(
      allMoves.map((move) => ({
        ...move,
        from: formatPosition(move.from),
        to: formatPosition(move.to),
      })),
    );

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

    console.log(
      "newValidMoves",
      newValidMoves.map((move) => ({
        ...move,
        from: formatPosition(move.from),
        to: formatPosition(move.to),
      })),
    );

    return newValidMoves;
  }, [selectedPieceMode, selectedSquare, gameState]);

  const handlePieceSelectionChange = (mode: "both" | "first" | "second") => {
    setSelectedPieceMode(mode);
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (!game || !isMyTurn || game.status !== "active") return;

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
          // TODO: Implement promotion; For now just queen
          targetMove.promotion = "q";
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

  const executeMove = async (move: Move) => {
    try {
      await makeMove({ gameId, move: JSON.stringify(move) });

      if (move.capturedPieces && move.capturedPieces.length > 0) {
        toast.success("Piece captured!");
      }
    } catch {
      toast.error("Invalid move");
    }
  };

  // Convert Move[] to Position[] for ChessBoard component compatibility
  const validPositions: Position[] = validMoves.map((move) => move.to);

  console.log({
    validPositions: validPositions.map((pos) => formatPosition(pos)),
  });

  if (!game) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          flipped={game.isPracticeGame ? false : isBlackPlayer}
          isMyTurn={!!isMyTurn}
          currentTurn={gameState.options.turn}
        />
      </div>

      <div className="flex flex-col sm:flex-row xl:flex-col gap-4 xl:gap-6">
        {game.isPracticeGame && (
          <div className="flex-1">
            <GameControls gameState={gameState} gameId={gameId} />
          </div>
        )}

        <div className="flex-1">
          <GameInfo
            game={game}
            gameState={gameState}
            isWhitePlayer={isWhitePlayer}
            isBlackPlayer={isBlackPlayer}
          />
        </div>
        {/* <div className="flex-1">
          <MoveHistory moves={moveHistory} />
        </div> */}
        <div className="w-full">
          <EmailSubscribe compact />
        </div>
      </div>
    </div>
  );
}

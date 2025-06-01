/* eslint-disable @typescript-eslint/no-misused-promises */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ChessBoard } from "./ChessBoard";
import { GameInfo } from "./GameInfo";
import { MoveHistory } from "./MoveHistory";
import { useState, useEffect } from "react";
import {
  Board,
  MergedPieceTypes,
  Move,
  Position,
  getAllMovesForCell,
  getPieceMoves,
} from "../../convex/gameLogic";
import { toast } from "sonner";

interface ChessGameProps {
  gameId: Id<"games">;
}

export function ChessGame({ gameId }: ChessGameProps) {
  const game = useQuery(api.gameLogic.getGame, { gameId });
  const makeMove = useMutation(api.gameLogic.makeMove);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  // const [unmergePositions, setUnmergePositions] = useState<Position[]>([]);
  const [selectedPieceMode, setSelectedPieceMode] = useState<
    "both" | "first" | "second"
  >("both");

  // Parse board directly - expect new format only
  const board: Board = game
    ? JSON.parse(game.board)
    : Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );
  const moveHistory: Move[] = game
    ? game.moveHistory.map((m) => JSON.parse(m))
    : [];

  const isWhitePlayer = game?.whitePlayerId === loggedInUser?._id;
  const isBlackPlayer = game?.blackPlayerId === loggedInUser?._id;

  // For practice games, user can play both sides, otherwise enforce turn order
  const isMyTurn =
    game &&
    (game.isPracticeGame
      ? isWhitePlayer || isBlackPlayer
      : (game.currentTurn === "w" && isWhitePlayer) ||
        (game.currentTurn === "b" && isBlackPlayer));

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

  const handlePieceSelectionChange = (mode: "both" | "first" | "second") => {
    setSelectedPieceMode(mode);

    // Recalculate valid moves based on selected piece mode
    if (selectedSquare) {
      const selectedCell = board[selectedSquare.row][selectedSquare.col];
      let newValidMoves: Move[] = [];

      if (mode === "both") {
        // Get moves for all pieces in the cell
        newValidMoves = getAllMovesForCell(selectedSquare, board);
      } else if (mode === "first" && selectedCell.length >= 1) {
        // Get moves only for the first piece
        const piece = selectedCell[0];
        newValidMoves = getPieceMoves(piece, selectedSquare, board);
      } else if (mode === "second" && selectedCell.length >= 2) {
        // Get moves only for the second piece
        const piece = selectedCell[1];
        newValidMoves = getPieceMoves(piece, selectedSquare, board);
      }

      setValidMoves(newValidMoves);
    }
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (!game || !isMyTurn || game.status !== "active") return;

    const clickedCell = board[row][col];
    const position = { row, col };

    if (selectedSquare) {
      // Try to make a move
      const targetMove = validMoves.find(
        (move) => move.to.row === row && move.to.col === col,
      );
      const selectedCell = board[selectedSquare.row][selectedSquare.col];
      if (targetMove) {
        if (selectedPieceMode === "both" && selectedCell.length === 2) {
          targetMove.piece =
            `${selectedCell[0].pieceType}${selectedCell[1].pieceType}` as MergedPieceTypes;
        }

        await executeMove(targetMove);
      }

      setSelectedSquare(null);
      setValidMoves([]);
      setSelectedPieceMode("both");
    } else if (
      clickedCell.length > 0 &&
      clickedCell[0].color === game.currentTurn
    ) {
      // Select cell and get all possible moves
      setSelectedSquare(position);
      setSelectedPieceMode("both");

      const allMoves = getAllMovesForCell(position, board);
      setValidMoves(allMoves);
    }
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

  if (!game) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <ChessBoard
            board={board}
            selectedSquare={selectedSquare}
            validMoves={validPositions}
            // fullMoves={validMoves}
            // unmergePositions={unmergePositions}
            onSquareClick={handleSquareClick}
            onPieceSelectionChange={handlePieceSelectionChange}
            flipped={game.isPracticeGame ? false : isBlackPlayer}
            isMyTurn={!!isMyTurn}
            currentTurn={game.currentTurn}
          />
        </div>
      </div>

      <div className="space-y-6">
        <GameInfo
          game={game}
          isWhitePlayer={isWhitePlayer}
          isBlackPlayer={isBlackPlayer}
        />
        <MoveHistory moves={moveHistory} />
      </div>
    </div>
  );
}

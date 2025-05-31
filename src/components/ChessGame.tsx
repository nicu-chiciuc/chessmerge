/* eslint-disable @typescript-eslint/no-misused-promises */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ChessBoard } from "./ChessBoard";
import { GameInfo } from "./GameInfo";
import { MoveHistory } from "./MoveHistory";
import { UnmergeSelector, ViewMode } from "./UnmergeSelector";
import { useState, useEffect } from "react";
import {
  Board,
  Move,
  Position,
  Piece,
  getPieceMoves,
  getUnmergePositions,
  filterMovesByViewMode,
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
  const [unmergeMode, setUnmergeMode] = useState(false);
  const [unmergePositions, setUnmergePositions] = useState<Position[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("merged");
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);

  const board: Board = game ? JSON.parse(game.board) : [];
  const moveHistory: Move[] = game
    ? game.moveHistory.map((m) => JSON.parse(m))
    : [];

  const isWhitePlayer = game?.whitePlayerId === loggedInUser?._id;
  const isBlackPlayer = game?.blackPlayerId === loggedInUser?._id;
  const isMyTurn =
    game &&
    ((game.currentTurn === "white" && isWhitePlayer) ||
      (game.currentTurn === "black" && isBlackPlayer));

  useEffect(() => {
    if (game?.status === "completed") {
      if (game.gameEndReason === "checkmate") {
        toast.success(
          `Checkmate! ${game.winner === "white" ? "White" : "Black"} wins!`,
        );
      } else if (game.gameEndReason === "stalemate") {
        toast.info("Stalemate! Game is a draw.");
      }
    }
  }, [game?.status, game?.gameEndReason, game?.winner]);

  const handleRightClick = (row: number, col: number) => {
    if (!game || !isMyTurn || game.status !== "active") return;

    const piece = board[row][col];
    if (piece?.merged && piece.color === game.currentTurn) {
      setSelectedSquare({ row, col });
      setUnmergeMode(true);
      setValidMoves([]);
      setUnmergePositions(getUnmergePositions({ row, col }, board));
      toast.info("Click an empty adjacent square to unmerge");
    }
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (!game || !isMyTurn || game.status !== "active") return;

    const clickedPiece = board[row][col];
    const position = { row, col };

    if (unmergeMode && selectedSquare) {
      // Handle unmerge
      const selectedPiece = board[selectedSquare.row][selectedSquare.col];
      if (selectedPiece?.merged && !clickedPiece) {
        try {
          const move: Move = {
            from: selectedSquare,
            to: position,
            piece: selectedPiece,
            moveType: "unmerge",
            unmergePositions: [position],
          };

          await makeMove({ gameId, move: JSON.stringify(move) });
          setSelectedSquare(null);
          setUnmergeMode(false);
          setUnmergePositions([]);
          setSelectedPiece(null);
          setViewMode("merged");
        } catch {
          toast.error("Invalid unmerge");
        }
      }
      return;
    }

    if (selectedSquare) {
      // Try to make a move
      const targetMove = validMoves.find(
        (move) => move.to.row === row && move.to.col === col,
      );
      if (targetMove) {
        await executeMove(targetMove);
      }

      setSelectedSquare(null);
      setValidMoves([]);
      setSelectedPiece(null);
      setViewMode("merged");
    } else if (clickedPiece && clickedPiece.color === game.currentTurn) {
      // Select piece and get all possible moves
      setSelectedSquare(position);
      setSelectedPiece(clickedPiece);

      const allMoves = getPieceMoves(clickedPiece, position, board);
      const filteredMoves = filterMovesByViewMode(
        allMoves,
        clickedPiece,
        viewMode,
      );
      setValidMoves(filteredMoves);

      // If it's a merged piece, reset to merged view
      if (clickedPiece.merged) {
        setViewMode("merged");
      }
    }
  };

  const executeMove = async (move: Move) => {
    try {
      await makeMove({ gameId, move: JSON.stringify(move) });

      if (move.moveType === "merge") {
        toast.success("Pieces merged!");
      } else if (move.capturedPiece) {
        toast.success("Piece captured!");
      }
    } catch {
      toast.error("Invalid move");
    }
  };

  const cancelAction = () => {
    setSelectedSquare(null);
    setUnmergeMode(false);
    setValidMoves([]);
    setUnmergePositions([]);
    setSelectedPiece(null);
    setViewMode("merged");
  };

  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);

    if (selectedPiece && selectedSquare) {
      const allMoves = getPieceMoves(selectedPiece, selectedSquare, board);
      const filteredMoves = filterMovesByViewMode(
        allMoves,
        selectedPiece,
        newViewMode,
      );
      setValidMoves(filteredMoves);
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
            fullMoves={validMoves}
            unmergePositions={unmergePositions}
            onSquareClick={handleSquareClick}
            onRightClick={handleRightClick}
            flipped={isBlackPlayer}
            unmergeMode={unmergeMode}
            isMyTurn={!!isMyTurn}
            currentTurn={game.currentTurn}
          />

          {selectedPiece?.merged && !unmergeMode && (
            <UnmergeSelector
              piece={selectedPiece}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          )}

          <div className="mt-4 text-center">
            {unmergeMode && (
              <button
                onClick={cancelAction}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 mb-2"
              >
                Cancel Unmerge
              </button>
            )}
            <div className="text-sm text-gray-600">
              <p>• Move pieces normally or onto same-color pieces to merge</p>
              <p>• Right-click merged pieces to unmerge them</p>
            </div>
          </div>
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

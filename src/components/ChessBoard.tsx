import { Board, Position, Piece, PieceType } from "../../convex/gameLogic";
import { useState } from "react";

// Import all chess piece SVGs
import whiteKingSvg from "../pieces/Chess_klt45.svg";
import whiteQueenSvg from "../pieces/Chess_qlt45.svg";
import whiteRookSvg from "../pieces/Chess_rlt45.svg";
import whiteBishopSvg from "../pieces/Chess_blt45.svg";
import whiteKnightSvg from "../pieces/Chess_nlt45.svg";
import whitePawnSvg from "../pieces/Chess_plt45.svg";
import blackKingSvg from "../pieces/Chess_kdt45.svg";
import blackQueenSvg from "../pieces/Chess_qdt45.svg";
import blackRookSvg from "../pieces/Chess_rdt45.svg";
import blackBishopSvg from "../pieces/Chess_bdt45.svg";
import blackKnightSvg from "../pieces/Chess_ndt45.svg";
import blackPawnSvg from "../pieces/Chess_pdt45.svg";

function mapToName(piece: PieceType) {
  switch (piece) {
    case "k":
      return "King";
    case "q":
      return "Queen";
    case "r":
      return "Rook";
    case "b":
      return "Bishop";
    case "n":
      return "Knight";
    case "p":
      return "Pawn";
    default:
      piece satisfies never;
      return "Unknown";
  }
}

interface ChessBoardProps {
  board: Board;
  selectedSquare: Position | null;
  validMoves: Position[];
  // fullMoves?: Move[];
  // unmergePositions: Position[];
  onSquareClick: (row: number, col: number) => void;
  onPieceSelectionChange?: (mode: "both" | "first" | "second") => void;
  flipped?: boolean;
  isMyTurn?: boolean;
  currentTurn?: "w" | "b";
}

const getPieceSvg = (piece: Piece) => {
  const pieceMap = {
    w: {
      k: whiteKingSvg,
      q: whiteQueenSvg,
      r: whiteRookSvg,
      b: whiteBishopSvg,
      n: whiteKnightSvg,
      p: whitePawnSvg,
    },
    b: {
      k: blackKingSvg,
      q: blackQueenSvg,
      r: blackRookSvg,
      b: blackBishopSvg,
      n: blackKnightSvg,
      p: blackPawnSvg,
    },
  };
  return pieceMap[piece.color][piece.pieceType];
};

export function ChessBoard({
  board,
  selectedSquare,
  validMoves,
  onSquareClick,
  onPieceSelectionChange,
  flipped = false,
  isMyTurn = false,
  currentTurn = "w",
}: ChessBoardProps) {
  const [draggedPiece, setDraggedPiece] = useState<{
    piece: Piece;
    pieceIndex: number;
    position: Position;
  } | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<Position | null>(null);
  const [selectedPieceMode, setSelectedPieceMode] = useState<
    "both" | "first" | "second"
  >("both");

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  // Get the selected cell and its pieces
  const selectedCell = selectedSquare
    ? board[selectedSquare.row][selectedSquare.col]
    : null;
  const hasTwoPieces = selectedCell && selectedCell.length === 2;

  // Reset piece selection mode when square changes
  const resetPieceMode = () => {
    setSelectedPieceMode("both");
    onPieceSelectionChange?.("both");
  };

  const handlePieceSelectionChange = (mode: "both" | "first" | "second") => {
    setSelectedPieceMode(mode);
    onPieceSelectionChange?.(mode);
  };

  const handleSquareClick = (row: number, col: number) => {
    // Reset piece mode when selecting a different square
    if (
      !selectedSquare ||
      selectedSquare.row !== row ||
      selectedSquare.col !== col
    ) {
      resetPieceMode();
    }
    onSquareClick(row, col);
  };

  const handleDragStart = (
    e: React.DragEvent,
    row: number,
    col: number,
    pieceIndex: number,
  ) => {
    const cell = board[row][col];
    const piece = cell[pieceIndex];
    if (!piece || !isMyTurn || piece.color !== currentTurn) {
      e.preventDefault();
      return;
    }

    setDraggedPiece({ piece, pieceIndex, position: { row, col } });

    // Create a custom drag image using SVG
    const dragImage = document.createElement("div");
    dragImage.className = "w-8 h-8 flex items-center justify-center";

    const img = document.createElement("img");

    img.src = getPieceSvg(piece);
    img.className = "w-8 h-8 object-contain";
    dragImage.appendChild(img);

    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);

    e.dataTransfer.setDragImage(dragImage, 16, 16);
    e.dataTransfer.effectAllowed = "move";

    // Clean up drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);

    // Auto-select the piece being dragged
    onSquareClick(row, col);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setDragOverSquare(null);
  };

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSquare({ row, col });
  };

  const handleDragLeave = () => {
    setDragOverSquare(null);
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragOverSquare(null);

    if (draggedPiece) {
      // Trigger the move by clicking on the target square
      onSquareClick(row, col);
    }

    setDraggedPiece(null);
  };

  const renderSquare = (row: number, col: number) => {
    const cell = board[row][col];

    const isLight = (row + col) % 2 === 0;
    const isSelected =
      selectedSquare?.row === row && selectedSquare?.col === col;
    const isValidMove = validMoves.some(
      (move) => move.row === row && move.col === col,
    );

    const isDraggedSquare =
      draggedPiece?.position.row === row && draggedPiece?.position.col === col;
    const isDragOver =
      dragOverSquare?.row === row && dragOverSquare?.col === col;

    let squareClass = `
      aspect-square flex items-center justify-center cursor-pointer relative
      ${isLight ? "bg-amber-100" : "bg-amber-800"}
      ${isSelected ? "ring-2 sm:ring-4 ring-blue-500 z-20" : ""}
      ${isDraggedSquare ? "opacity-50" : ""}
      ${isDragOver ? "bg-blue-200" : ""}
      hover:brightness-110 transition-all
    `;

    // Highlight cells that can be unmerged (have 2 pieces)
    if (
      cell.length === 2 &&
      cell[0].color === currentTurn &&
      isMyTurn &&
      !isSelected
    ) {
      squareClass += " ring-2 ring-orange-300 z-10";
    }

    const canDragAnyPiece = cell.some(
      (piece) => piece.color === currentTurn && isMyTurn,
    );

    return (
      <div
        key={`${row}-${col}`}
        className={squareClass}
        onClick={() => handleSquareClick(row, col)}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onDragOver={(e) => handleDragOver(e, row, col)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, row, col)}
      >
        {cell.length > 0 && (
          <ChessPieceCell
            pieces={cell}
            canDrag={canDragAnyPiece}
            onDragStart={(e, pieceIndex) =>
              handleDragStart(e, row, col, pieceIndex)
            }
            onDragEnd={handleDragEnd}
            selectedPieceMode={isSelected ? selectedPieceMode : "both"}
          />
        )}

        {/* Coordinate labels */}
        {col === 0 && (
          <div
            className={`absolute left-[5%] top-[5%] text-[0.6em] sm:text-[0.7em] font-bold ${isLight ? "text-amber-800" : "text-amber-100"}`}
          >
            {ranks[row]}
          </div>
        )}
        {row === 7 && (
          <div
            className={`absolute right-[5%] bottom-[5%] text-[0.6em] sm:text-[0.7em] font-bold ${isLight ? "text-amber-800" : "text-amber-100"}`}
          >
            {files[col]}
          </div>
        )}

        {/* Move indicators */}
        {isValidMove && cell.length === 0 && (
          <div className="absolute inset-[10%] border-[0.2em] border-green-500 rounded-full pointer-events-none" />
        )}
        {isValidMove && cell.length > 0 && (
          <div className="absolute inset-0 border-[0.3em] border-green-500 rounded pointer-events-none" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full max-w-[min(90vw,90vh)] mx-auto">
        <div className="grid grid-cols-8 border-2 border-gray-800 w-full">
          {Array.from({ length: 8 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => {
              const actualRow = flipped ? 7 - row : row;
              const actualCol = flipped ? 7 - col : col;
              return renderSquare(actualRow, actualCol);
            }),
          )}
        </div>
      </div>

      {/* Piece selection buttons for merged pieces */}
      {hasTwoPieces && selectedCell && isMyTurn && (
        <div className="mt-4 p-3 sm:p-4 bg-gray-100 rounded-lg border max-w-xs sm:max-w-sm md:max-w-md mx-auto w-full">
          <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Choose which piece(s) to move:
          </div>
          <div className="flex gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={() => handlePieceSelectionChange("first")}
              className={`px-2 sm:px-3 py-1 sm:py-2 rounded border text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-1 min-w-0 ${
                selectedPieceMode === "first"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <ChessPieceContent piece={selectedCell[0]} size="small" />
              <span className="truncate">
                Only {mapToName(selectedCell[0].pieceType)}
              </span>
            </button>
            <button
              onClick={() => handlePieceSelectionChange("second")}
              className={`px-2 sm:px-3 py-1 sm:py-2 rounded border text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-1 min-w-0 ${
                selectedPieceMode === "second"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <ChessPieceContent piece={selectedCell[1]} size="small" />
              <span className="truncate">
                Only {mapToName(selectedCell[1].pieceType)}
              </span>
            </button>
            <button
              onClick={() => handlePieceSelectionChange("both")}
              className={`px-2 sm:px-3 py-1 sm:py-2 rounded border text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-1 min-w-0 ${
                selectedPieceMode === "both"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex -space-x-1">
                <ChessPieceContent piece={selectedCell[0]} size="small" />
                <ChessPieceContent piece={selectedCell[1]} size="small" />
              </div>
              <span className="truncate">Both pieces</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChessPieceCellProps {
  pieces: Piece[];
  canDrag?: boolean;
  onDragStart?: (e: React.DragEvent, pieceIndex: number) => void;
  onDragEnd?: () => void;
  selectedPieceMode?: "both" | "first" | "second";
}

function ChessPieceCell({
  pieces,
  canDrag = false,
  onDragStart,
  onDragEnd,
  selectedPieceMode = "both",
}: ChessPieceCellProps) {
  if (pieces.length === 0) return null;

  if (pieces.length === 1) {
    // Single piece
    return (
      <ChessPiece
        piece={pieces[0]}
        draggable={canDrag}
        onDragStart={(e) => onDragStart?.(e, 0)}
        onDragEnd={onDragEnd}
      />
    );
  }

  if (pieces.length === 2) {
    // Two pieces merged - display both with each piece cut in half
    // Arrange pieces so that knights are on the left (head visible)
    const [leftPiece, rightPiece] = pieces.some((p) => p.pieceType === "n")
      ? [
          pieces.find((p) => p.pieceType === "n")!,
          pieces.find((p) => p.pieceType !== "n")!,
        ]
      : pieces;

    // Apply visual highlighting based on selected piece mode
    const getOpacity = (pieceIndex: number) => {
      if (selectedPieceMode === "both") return "";
      if (selectedPieceMode === "first" && pieceIndex === 0) return "";
      if (selectedPieceMode === "second" && pieceIndex === 1) return "";
      return "opacity-30";
    };

    return (
      <div className="relative w-full h-full flex p-[10%]">
        {/* Left half - show right side of piece */}
        <div
          className={`${canDrag ? "cursor-grab active:cursor-grabbing" : ""} w-1/2 h-full overflow-hidden relative ${getOpacity(pieces.indexOf(leftPiece))}`}
          draggable={canDrag}
          onDragStart={(e) => onDragStart?.(e, pieces.indexOf(leftPiece))}
          onDragEnd={onDragEnd}
        >
          <div className="absolute left-0 top-0 w-[200%] h-full flex items-center justify-center">
            <ChessPieceContent piece={leftPiece} size="responsive" />
          </div>
        </div>
        {/* Right half - show left side of piece */}
        <div
          className={`${canDrag ? "cursor-grab active:cursor-grabbing" : ""} w-1/2 h-full overflow-hidden relative ${getOpacity(pieces.indexOf(rightPiece))}`}
          draggable={canDrag}
          onDragStart={(e) => onDragStart?.(e, pieces.indexOf(rightPiece))}
          onDragEnd={onDragEnd}
        >
          <div className="absolute right-0 top-0 w-[200%] h-full flex items-center justify-center">
            <ChessPieceContent piece={rightPiece} size="responsive" />
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't happen in chess, but provide a fallback
  return (
    <div className="w-full h-full bg-red-500 flex items-center justify-center text-white text-[0.5em] font-bold">
      {pieces.length}
    </div>
  );
}

interface ChessPieceProps {
  piece: Piece;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

function ChessPiece({
  piece,
  draggable = false,
  onDragStart,
  onDragEnd,
}: ChessPieceProps) {
  return (
    <div
      className={`${draggable ? "cursor-grab active:cursor-grabbing" : ""} flex items-center justify-center w-full h-full p-[10%]`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <ChessPieceContent piece={piece} size="responsive" />
    </div>
  );
}

interface ChessPieceContentProps {
  piece: Piece;
  size: "small" | "medium" | "large" | "responsive";
}

function ChessPieceContent({ piece, size }: ChessPieceContentProps) {
  const svgSrc = getPieceSvg(piece);

  const sizeClasses = {
    small: "w-3 h-3 sm:w-4 sm:h-4",
    medium: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6",
    large: "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8",
    responsive: "w-full h-full",
  };

  return (
    <img
      src={svgSrc}
      alt={`${piece.color} ${piece.pieceType}`}
      className={`${sizeClasses[size]} object-contain`}
    />
  );
}

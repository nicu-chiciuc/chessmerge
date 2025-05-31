import { Board, Position, Piece } from "../../convex/gameLogic";
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

interface ChessBoardProps {
  board: Board;
  selectedSquare: Position | null;
  validMoves: Position[];
  unmergePositions: Position[];
  onSquareClick: (row: number, col: number) => void;
  onRightClick?: (row: number, col: number) => void;
  flipped?: boolean;
  unmergeMode?: boolean;
  isMyTurn?: boolean;
  currentTurn?: "white" | "black";
}

export function ChessBoard({
  board,
  selectedSquare,
  validMoves,
  unmergePositions,
  onSquareClick,
  onRightClick,
  flipped = false,
  unmergeMode = false,
  isMyTurn = false,
  currentTurn = "white",
}: ChessBoardProps) {
  const [draggedPiece, setDraggedPiece] = useState<{
    piece: Piece;
    position: Position;
  } | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<Position | null>(null);

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const getPieceSymbol = (type: string, color: string) => {
    const symbols = {
      white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙",
      },
      black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟",
      },
    };
    return (
      symbols[color as keyof typeof symbols][
        type as keyof typeof symbols.white
      ] || ""
    );
  };

  const handleDragStart = (e: React.DragEvent, row: number, col: number) => {
    const piece = board[row][col];
    if (!piece || !isMyTurn || piece.color !== currentTurn) {
      e.preventDefault();
      return;
    }

    setDraggedPiece({ piece, position: { row, col } });

    // Create a custom drag image
    const dragImage = document.createElement("div");
    dragImage.innerHTML = getPieceSymbol(piece.type, piece.color);
    dragImage.style.fontSize = "32px";
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
    const piece = board[row][col];

    const isLight = (row + col) % 2 === 0;
    const isSelected =
      selectedSquare?.row === row && selectedSquare?.col === col;
    const isValidMove = validMoves.some(
      (move) => move.row === row && move.col === col,
    );
    const isUnmergePosition = unmergePositions.some(
      (pos) => pos.row === row && pos.col === col,
    );
    const isDraggedSquare =
      draggedPiece?.position.row === row && draggedPiece?.position.col === col;
    const isDragOver =
      dragOverSquare?.row === row && dragOverSquare?.col === col;

    let squareClass = `
      w-12 h-12 flex items-center justify-center cursor-pointer relative
      ${isLight ? "bg-amber-100" : "bg-amber-800"}
      ${isSelected ? "ring-4 ring-blue-500" : ""}
      ${isValidMove ? "ring-2 ring-green-500" : ""}
      ${isUnmergePosition ? "ring-2 ring-purple-500" : ""}
      ${isDraggedSquare ? "opacity-50" : ""}
      ${isDragOver ? "bg-blue-200" : ""}
      hover:brightness-110 transition-all
    `;

    // Highlight merged pieces that can be unmerged
    if (
      piece?.merged &&
      piece.color === currentTurn &&
      isMyTurn &&
      !unmergeMode
    ) {
      squareClass += " ring-2 ring-orange-300";
    }

    const canDragPiece = !!(piece && isMyTurn && piece.color === currentTurn);

    return (
      <div
        key={`${row}-${col}`}
        className={squareClass}
        onClick={() => onSquareClick(row, col)}
        onContextMenu={(e) => {
          e.preventDefault();
          onRightClick?.(row, col);
        }}
        onDragOver={(e) => handleDragOver(e, row, col)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, row, col)}
      >
        {piece && (
          <ChessPiece
            piece={piece}
            draggable={canDragPiece}
            onDragStart={(e) => handleDragStart(e, row, col)}
            onDragEnd={handleDragEnd}
          />
        )}

        {/* Coordinate labels */}
        {col === 0 && (
          <div className="absolute left-1 top-1 text-xs font-bold opacity-60">
            {ranks[row]}
          </div>
        )}
        {row === 7 && (
          <div className="absolute right-1 bottom-1 text-xs font-bold opacity-60">
            {files[col]}
          </div>
        )}

        {/* Move indicators */}
        {isValidMove && !piece && (
          <div className="w-3 h-3 bg-green-500 rounded-full opacity-60" />
        )}
        {isValidMove && piece && (
          <div className="absolute inset-0 border-4 border-green-500 rounded opacity-60" />
        )}
        {isUnmergePosition && (
          <div className="w-3 h-3 bg-purple-500 rounded-full opacity-60" />
        )}
      </div>
    );
  };

  return (
    <div className="inline-block">
      <div className="grid grid-cols-8 border-2 border-gray-800">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const actualRow = flipped ? 7 - row : row;
            const actualCol = flipped ? 7 - col : col;
            return renderSquare(actualRow, actualCol);
          }),
        )}
      </div>

      {unmergeMode && (
        <div className="mt-2 text-center text-sm text-gray-600">
          Click an empty adjacent square to unmerge the selected piece
        </div>
      )}
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
  const getPieceSvg = (type: string, color: string) => {
    const pieceMap = {
      white: {
        king: whiteKingSvg,
        queen: whiteQueenSvg,
        rook: whiteRookSvg,
        bishop: whiteBishopSvg,
        knight: whiteKnightSvg,
        pawn: whitePawnSvg,
      },
      black: {
        king: blackKingSvg,
        queen: blackQueenSvg,
        rook: blackRookSvg,
        bishop: blackBishopSvg,
        knight: blackKnightSvg,
        pawn: blackPawnSvg,
      },
    };

    return pieceMap[color as keyof typeof pieceMap]?.[
      type as keyof typeof pieceMap.white
    ];
  };

  const getPieceSymbol = (type: string, color: string) => {
    // Fallback Unicode symbols (keeping for backwards compatibility)
    const symbols = {
      white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙",
      },
      black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟",
      },
    };
    return (
      symbols[color as keyof typeof symbols][
        type as keyof typeof symbols.white
      ] || ""
    );
  };

  const renderPieceContent = (
    type: string,
    color: string,
    size: "small" | "medium" | "large" = "large",
  ) => {
    const svgSrc = getPieceSvg(type, color);

    if (svgSrc) {
      const sizeClasses = {
        small: "w-3 h-3",
        medium: "w-6 h-6",
        large: "w-8 h-8",
      };

      return (
        <img
          src={svgSrc}
          alt={`${color} ${type}`}
          className={`${sizeClasses[size]} object-contain`}
        />
      );
    }

    // Fallback to Unicode symbols if SVG not found
    const textSizeClasses = {
      small: "text-xs",
      medium: "text-lg",
      large: "text-2xl",
    };

    return (
      <div className={`${textSizeClasses[size]} leading-none`}>
        {getPieceSymbol(type, color)}
      </div>
    );
  };

  if (piece.merged) {
    // Display merged piece with both symbols
    const content1 = renderPieceContent(
      piece.merged.piece1,
      piece.color,
      "medium",
    );
    const content2 = renderPieceContent(
      piece.merged.piece2,
      piece.color,
      "small",
    );

    return (
      <div
        className={`relative ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {content1}
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center border">
          {content2}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${draggable ? "cursor-grab active:cursor-grabbing" : ""} flex items-center justify-center`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {renderPieceContent(piece.type, piece.color)}
    </div>
  );
}

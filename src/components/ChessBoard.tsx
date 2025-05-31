import { Board, Position, Piece } from "../../convex/gameLogic";
import { useState } from "react";

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

  if (piece.merged) {
    // Display merged piece with both symbols
    const symbol1 = getPieceSymbol(piece.merged.piece1, piece.color);
    const symbol2 = getPieceSymbol(piece.merged.piece2, piece.color);

    return (
      <div
        className={`relative ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="text-2xl leading-none">{symbol1}</div>
        <div className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full w-4 h-4 flex items-center justify-center border">
          {symbol2}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`text-2xl leading-none ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {getPieceSymbol(piece.type, piece.color)}
    </div>
  );
}

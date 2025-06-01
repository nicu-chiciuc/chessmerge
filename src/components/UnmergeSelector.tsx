import { Piece, PieceType, PieceColor } from "../../convex/gameLogic";

export type ViewMode = "merged" | "piece1" | "piece2";

interface UnmergeSelectorProps {
  piece: Piece;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function UnmergeSelector({
  piece,
  viewMode,
  onViewModeChange,
}: UnmergeSelectorProps) {
  if (piece.type !== "merged") return null;

  const renderPieceButton = (
    type: PieceType,
    color: PieceColor,
    isSelected: boolean,
    onClick: () => void,
    label: string,
  ) => {
    const getPieceSymbol = (pieceType: string, pieceColor: string) => {
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
        symbols[pieceColor as keyof typeof symbols][
          pieceType as keyof typeof symbols.white
        ] || ""
      );
    };

    return (
      <button
        onClick={onClick}
        className={`
          flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
          min-w-[80px] h-20
          ${
            isSelected
              ? "border-blue-500 bg-blue-50 shadow-md"
              : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
          }
        `}
      >
        <div className="text-2xl mb-1">{getPieceSymbol(type, color)}</div>
        <div className="text-xs text-gray-600 capitalize">{label}</div>
      </button>
    );
  };

  const renderMergedButton = (isSelected: boolean, onClick: () => void) => {
    if (piece.type !== "merged") return null;

    const getPieceSymbol = (pieceType: string, pieceColor: string) => {
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
        symbols[pieceColor as keyof typeof symbols][
          pieceType as keyof typeof symbols.white
        ] || ""
      );
    };

    return (
      <button
        onClick={onClick}
        className={`
          flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
          min-w-[80px] h-20 relative
          ${
            isSelected
              ? "border-blue-500 bg-blue-50 shadow-md"
              : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
          }
        `}
      >
        <div className="relative">
          <div className="text-xl">
            {getPieceSymbol(piece.piece1, piece.color)}
          </div>
          <div className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full w-5 h-5 flex items-center justify-center border">
            {getPieceSymbol(piece.piece2, piece.color)}
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">Merged</div>
      </button>
    );
  };

  return (
    <div className="flex justify-center items-center space-x-4 mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600 mr-2">View moves for:</div>

      {piece.type === "merged" &&
        renderPieceButton(
          piece.piece1,
          piece.color,
          viewMode === "piece1",
          () => onViewModeChange("piece1"),
          piece.piece1,
        )}

      {renderMergedButton(viewMode === "merged", () =>
        onViewModeChange("merged"),
      )}

      {piece.type === "merged" &&
        renderPieceButton(
          piece.piece2,
          piece.color,
          viewMode === "piece2",
          () => onViewModeChange("piece2"),
          piece.piece2,
        )}
    </div>
  );
}

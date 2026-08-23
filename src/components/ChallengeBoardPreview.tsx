import { createInitialGameState, type Board } from "../../lib/chessmerge";
import { ChessBoard } from "./ChessBoard";

const previewBoard = createPreviewBoard();

export function ChallengeBoardPreview() {
  return (
    <section
      className="order-last min-w-0 md:order-first"
      aria-label="ChessMerge board preview"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 px-0.5 py-2">
        <strong className="font-serif text-lg sm:text-xl">
          ChessMerge board
        </strong>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          Static preview
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border-[5px] border-[#4a2b20] bg-[#4a2b20] shadow-xl sm:border-[7px] sm:rounded-xl">
        <div
          role="img"
          aria-label="Static ChessMerge board preview with a merged white knight and bishop on c3"
          data-preview-board
        >
          <div aria-hidden="true">
            <ChessBoard
              board={previewBoard}
              selectedSquare={null}
              validMoves={[]}
              onSquareClick={() => undefined}
              needsPromotion={null}
              setSelectedPromotion={() => undefined}
              readOnly
            />
          </div>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-2 font-mono text-[0.65rem] text-muted-foreground">
        <span
          className="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
          aria-hidden="true"
        >
          +
        </span>
        Merged knight and bishop on c3
      </p>
    </section>
  );
}

function createPreviewBoard(): Board {
  const { board } = createInitialGameState();

  board[0][1] = [];
  board[1][3] = [];
  board[3][3] = [{ color: "b", pieceType: "p" }];
  board[4][4] = [{ color: "w", pieceType: "p" }];
  board[5][2] = [
    { color: "w", pieceType: "n" },
    { color: "w", pieceType: "b" },
  ];
  board[6][4] = [];
  board[7][1] = [];
  board[7][2] = [];

  return board;
}

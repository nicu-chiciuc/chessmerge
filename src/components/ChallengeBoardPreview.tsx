import blackBishop from "../pieces/Chess_bdt45.svg";
import blackKing from "../pieces/Chess_kdt45.svg";
import blackKnight from "../pieces/Chess_ndt45.svg";
import blackPawn from "../pieces/Chess_pdt45.svg";
import blackQueen from "../pieces/Chess_qdt45.svg";
import blackRook from "../pieces/Chess_rdt45.svg";
import whiteBishop from "../pieces/Chess_blt45.svg";
import whiteKing from "../pieces/Chess_klt45.svg";
import whiteKnight from "../pieces/Chess_nlt45.svg";
import whitePawn from "../pieces/Chess_plt45.svg";
import whiteQueen from "../pieces/Chess_qlt45.svg";
import whiteRook from "../pieces/Chess_rlt45.svg";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const backRank = ["r", "n", "b", "q", "k", "b", "n", "r"] as const;

type PreviewPiece = {
  color: "black" | "white";
  type: "b" | "k" | "n" | "p" | "q" | "r";
};

const pieceSources = {
  black: {
    b: blackBishop,
    k: blackKing,
    n: blackKnight,
    p: blackPawn,
    q: blackQueen,
    r: blackRook,
  },
  white: {
    b: whiteBishop,
    k: whiteKing,
    n: whiteKnight,
    p: whitePawn,
    q: whiteQueen,
    r: whiteRook,
  },
} satisfies Record<PreviewPiece["color"], Record<PreviewPiece["type"], string>>;

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
          className="grid aspect-square grid-cols-8"
          role="img"
          aria-label="Static ChessMerge board preview with a merged white knight and bishop on c3"
        >
          {Array.from({ length: 8 }, (_, rowIndex) => 8 - rowIndex).flatMap(
            (rank) =>
              files.map((file, fileIndex) => {
                const square = `${file}${rank}`;
                const pieces = getPreviewPieces(fileIndex, rank);
                const tone = (fileIndex + rank) % 2 === 0 ? "light" : "dark";

                return (
                  <span
                    key={square}
                    className={`relative grid min-w-0 place-items-center overflow-hidden ${
                      tone === "light" ? "bg-[#f1ddb3]" : "bg-[#87502f]"
                    }`}
                    data-square={square}
                    aria-hidden="true"
                  >
                    <small
                      className={`absolute top-1 left-1 z-10 font-mono text-[0.38rem] font-bold leading-none sm:text-[0.55rem] ${
                        tone === "light"
                          ? "text-[#4a2b20]/60"
                          : "text-[#fff4dc]/70"
                      }`}
                    >
                      {square}
                    </small>
                    <PreviewPieces pieces={pieces} />
                  </span>
                );
              }),
          )}
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

function PreviewPieces({ pieces }: { pieces: PreviewPiece[] }) {
  if (pieces.length === 0) return null;

  return (
    <span
      className={
        pieces.length === 1
          ? "pointer-events-none grid size-[78%] place-items-center [&>img]:size-full"
          : "pointer-events-none relative grid size-[78%] place-items-center [&>img]:absolute [&>img]:size-[72%] [&>img:first-child]:-translate-x-[13%] [&>img:first-child]:-translate-y-[10%] [&>img:nth-child(2)]:translate-x-[16%] [&>img:nth-child(2)]:translate-y-[13%]"
      }
    >
      {pieces.map((piece, index) => (
        <img
          key={`${piece.color}-${piece.type}-${index}`}
          src={pieceSources[piece.color][piece.type]}
          alt=""
          draggable={false}
          className="object-contain select-none"
        />
      ))}
      {pieces.length > 1 ? (
        <small className="absolute right-0 bottom-0 z-10 grid size-[clamp(0.8rem,2.2vw,1.125rem)] place-items-center rounded-full bg-primary font-mono text-[clamp(0.45rem,1vw,0.625rem)] font-bold text-primary-foreground">
          +
        </small>
      ) : null}
    </span>
  );
}

function getPreviewPieces(fileIndex: number, rank: number): PreviewPiece[] {
  const type = backRank[fileIndex];

  if (rank === 8 && fileIndex !== 1) return [{ color: "black", type }];
  if (rank === 7 && fileIndex !== 3) {
    return [{ color: "black", type: "p" }];
  }
  if (rank === 5 && fileIndex === 3) {
    return [{ color: "black", type: "p" }];
  }
  if (rank === 4 && fileIndex === 4) {
    return [{ color: "white", type: "p" }];
  }
  if (rank === 3 && fileIndex === 2) {
    return [
      { color: "white", type: "n" },
      { color: "white", type: "b" },
    ];
  }
  if (rank === 2 && fileIndex !== 4) {
    return [{ color: "white", type: "p" }];
  }
  if (rank === 1 && fileIndex !== 1 && fileIndex !== 2) {
    return [{ color: "white", type }];
  }

  return [];
}

import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, Link, RotateCcw, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  applyMove,
  createInitialGameState,
  getAllMovesForCell,
} from "../../lib/chessmerge";
import type { GameState, Move, Piece, Position } from "../../lib/chessmerge";
import { ChessBoard } from "./ChessBoard";
import {
  formatSandboxPosition,
  isDefaultSandboxPosition,
  parseSandboxPosition,
  serializeSandboxPosition,
} from "./sandboxPosition";
import type { SandboxPositionResult } from "./sandboxPosition";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type PieceSelectionMode = "both" | "first" | "second";

interface SandboxSession {
  setup: GameState;
  position: GameState;
  history: GameState[];
}

const defaultPosition = createInitialGameState();

export function LocalPracticePage() {
  const serializedPosition = useSearch({
    from: "/practice",
    select: (search) => search.gameState,
  });
  const parsedPosition = useMemo<SandboxPositionResult>(
    () =>
      serializedPosition
        ? parseSandboxPosition(serializedPosition)
        : { kind: "valid", gameState: defaultPosition },
    [serializedPosition],
  );
  const setup =
    parsedPosition.kind === "valid"
      ? parsedPosition.gameState
      : defaultPosition;
  const invalidLinkMessage =
    parsedPosition.kind === "invalid"
      ? `This setup link is invalid. ${parsedPosition.message} The starting board was loaded.`
      : null;

  return (
    <SandboxSessionView
      key={serializeSandboxPosition(setup)}
      initialSetup={setup}
      invalidLinkMessage={invalidLinkMessage}
    />
  );
}

function SandboxSessionView({
  initialSetup,
  invalidLinkMessage,
}: {
  initialSetup: GameState;
  invalidLinkMessage: string | null;
}) {
  const navigate = useNavigate({ from: "/practice" });
  const [session, setSession] = useState<SandboxSession>(() => ({
    setup: initialSetup,
    position: initialSetup,
    history: [],
  }));
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [selectedPieceMode, setSelectedPieceMode] =
    useState<PieceSelectionMode>("both");
  const [needsPromotion, setNeedsPromotion] = useState<Move | null>(null);
  const [positionDraft, setPositionDraft] = useState(() =>
    formatSandboxPosition(initialSetup),
  );
  const [positionError, setPositionError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  function clearInteraction() {
    setSelectedSquare(null);
    setSelectedPieceMode("both");
    setNeedsPromotion(null);
  }

  function setSelectedSquareWithMode(square: Position | null) {
    setSelectedSquare(square);
    setSelectedPieceMode("both");
  }

  const validMoves = useMemo(() => {
    if (!selectedSquare) {
      return [];
    }

    const selectedCell =
      session.position.board[selectedSquare.row][selectedSquare.col];
    const allMoves = getAllMovesForCell(selectedSquare, session.position);

    if (selectedCell.length < 2) {
      return allMoves;
    }

    switch (selectedPieceMode) {
      case "both":
        return allMoves.filter((move) => move.piece.length === 2);
      case "first":
        return allMoves.filter(
          (move) =>
            move.piece.length === 1 && move.piece === selectedCell[0].pieceType,
        );
      case "second":
        return allMoves.filter(
          (move) =>
            move.piece.length === 1 && move.piece === selectedCell[1].pieceType,
        );
      default: {
        const _exhaustive: never = selectedPieceMode;
        return _exhaustive;
      }
    }
  }, [selectedPieceMode, selectedSquare, session.position]);

  function commitMove(move: Move) {
    const nextPosition = applyMove(session.position, move);

    setSession((previous) => ({
      ...previous,
      position: nextPosition,
      history: [...previous.history, previous.position],
    }));
    clearInteraction();
  }

  function handleSquareClick(row: number, col: number) {
    setNeedsPromotion(null);

    if (selectedSquare) {
      const targetMove = validMoves.find(
        (move) => move.to.row === row && move.to.col === col,
      );

      if (targetMove) {
        if (targetMove.isPromotion) {
          setNeedsPromotion(targetMove);
          return;
        }

        commitMove(targetMove);
        return;
      }
    }

    const clickedCell = session.position.board[row][col];

    if (clickedCell[0]?.color === session.position.options.turn) {
      setSelectedSquareWithMode({ row, col });
      return;
    }

    setSelectedSquareWithMode(null);
  }

  function selectPromotion(piece: Piece) {
    if (!needsPromotion) {
      return;
    }

    commitMove({ ...needsPromotion, promotion: piece.pieceType });
  }

  function undo() {
    const previousPosition = session.history[session.history.length - 1];

    if (!previousPosition) {
      return;
    }

    setSession((previous) => ({
      ...previous,
      position: previousPosition,
      history: previous.history.slice(0, -1),
    }));
    clearInteraction();
  }

  function reset() {
    setSession((previous) => ({
      ...previous,
      position: previous.setup,
      history: [],
    }));
    clearInteraction();
  }

  function applyPositionDraft() {
    const parsedDraft = parseSandboxPosition(positionDraft);

    if (parsedDraft.kind === "invalid") {
      setPositionError(parsedDraft.message);
      return;
    }

    const nextSetup = parsedDraft.gameState;
    const serializedSetup = serializeSandboxPosition(nextSetup);

    setSession({ setup: nextSetup, position: nextSetup, history: [] });
    setPositionDraft(formatSandboxPosition(nextSetup));
    setPositionError(null);
    clearInteraction();

    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        gameState: isDefaultSandboxPosition(nextSetup)
          ? undefined
          : serializedSetup,
      }),
    });
  }

  function useCurrentPosition() {
    setPositionDraft(formatSandboxPosition(session.position));
    setPositionError(null);
  }

  async function copySetupLink() {
    const url = new URL(window.location.href);

    if (isDefaultSandboxPosition(session.setup)) {
      url.searchParams.delete("gameState");
    } else {
      url.searchParams.set(
        "gameState",
        serializeSandboxPosition(session.setup),
      );
    }

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyMessage("Setup link copied.");
    } catch {
      setCopyMessage("Copy failed. Use the browser address bar.");
    }
  }

  const turnName = session.position.options.turn === "w" ? "White" : "Black";
  const isAtSetup =
    serializeSandboxPosition(session.position) ===
    serializeSandboxPosition(session.setup);

  return (
    <section
      aria-labelledby="sandbox-title"
      className="px-4 py-6 sm:px-6 lg:py-8"
    >
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            id="sandbox-title"
            className="font-serif text-3xl font-semibold tracking-tight"
          >
            Sandbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Play both sides from any position.
          </p>
        </div>

        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 font-mono text-sm shadow-xs"
          data-turn={session.position.options.turn}
        >
          <span
            aria-hidden="true"
            className={`size-3 rounded-full border ${
              session.position.options.turn === "w"
                ? "bg-white"
                : "border-slate-800 bg-slate-800"
            }`}
          />
          {turnName} to move
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_18rem] lg:gap-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChessBoard
            board={session.position.board}
            selectedSquare={selectedSquare}
            validMoves={validMoves.map((move) => move.to)}
            onSquareClick={handleSquareClick}
            onPieceSelectionChange={setSelectedPieceMode}
            isMyTurn
            currentTurn={session.position.options.turn}
            needsPromotion={needsPromotion?.to ?? null}
            setSelectedPromotion={selectPromotion}
          />
        </div>

        <aside className="rounded-xl border border-t-4 border-t-primary bg-card p-4 shadow-sm">
          {invalidLinkMessage && (
            <p
              className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {invalidLinkMessage}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={session.history.length === 0}
              onClick={undo}
            >
              <Undo2 aria-hidden="true" />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isAtSetup && session.history.length === 0}
              onClick={reset}
            >
              <RotateCcw aria-hidden="true" />
              Reset
            </Button>
            <Button
              className="col-span-2"
              type="button"
              variant="secondary"
              onClick={() => void copySetupLink()}
            >
              <Link aria-hidden="true" />
              Copy setup link
            </Button>
          </div>

          {copyMessage && (
            <p
              aria-live="polite"
              className="pt-2 text-sm text-muted-foreground"
            >
              {copyMessage}
            </p>
          )}

          <details className="group mt-2 border-t pt-2">
            <summary className="flex min-h-10 list-none items-center justify-between rounded-md px-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              Advanced
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>

            <div className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="sandbox-femn">
                  FEMN position
                </label>
                <Textarea
                  id="sandbox-femn"
                  aria-describedby="sandbox-femn-note"
                  aria-invalid={positionError ? true : undefined}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="min-h-24 resize-y font-mono text-xs leading-relaxed"
                  spellCheck={false}
                  value={positionDraft}
                  onChange={(event) => {
                    setPositionDraft(event.target.value);
                    setPositionError(null);
                  }}
                />
                <p
                  id="sandbox-femn-note"
                  className="text-xs text-muted-foreground"
                >
                  Reset and copied links use the applied position.
                </p>
                {positionError && (
                  <p className="text-sm text-destructive" role="alert">
                    {positionError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={useCurrentPosition}
                >
                  Use current board
                </Button>
                <Button type="button" size="sm" onClick={applyPositionDraft}>
                  Apply position
                </Button>
              </div>
            </div>
          </details>
        </aside>
      </div>
    </section>
  );
}

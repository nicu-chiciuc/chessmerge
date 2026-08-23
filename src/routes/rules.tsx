import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules | ChessMerge" },
      {
        name: "description",
        content:
          "The complete ChessMerge rules for merging, pawns, promotion, castling, check, and game endings.",
      },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
      <header className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <Button asChild size="sm" variant="outline">
          <Link to="/">
            <ArrowLeft aria-hidden="true" />
            Lobby
          </Link>
        </Button>
        <h1 className="mt-6 font-serif text-[clamp(2.5rem,8vw,4.75rem)] leading-none tracking-tight">
          ChessMerge rules
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          ChessMerge uses ordinary chess movement, check, and checkmate, with
          the changes below. These are the rulings implemented by the game.
        </p>
      </header>

      <nav
        aria-label="Rules sections"
        className="my-6 flex flex-wrap gap-2 font-mono text-xs"
      >
        <RuleLink href="#merging">Merging</RuleLink>
        <RuleLink href="#pawns">Pawns</RuleLink>
        <RuleLink href="#promotion">Promotion</RuleLink>
        <RuleLink href="#castling">Castling</RuleLink>
        <RuleLink href="#ending">Check and game end</RuleLink>
      </nav>

      <div className="space-y-6">
        <section
          id="merging"
          className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm sm:p-8"
        >
          <h2 className="font-serif text-3xl tracking-tight">
            Merging and splitting
          </h2>
          <ul className="mt-5 grid gap-4 text-sm leading-6 text-muted-foreground sm:grid-cols-2 sm:text-base">
            <li>
              Move onto a friendly, unmerged piece to combine the two on one
              square. The destination must be legal for the moving piece.
            </li>
            <li>
              A square can hold at most two friendly pieces. A merged pair
              cannot merge with a third piece.
            </li>
            <li>
              On a later turn, move either component under its own movement
              rules. The other component stays behind, so the pair splits.
            </li>
            <li>
              The component that splits away may land on another friendly,
              unmerged piece and merge there in the same move.
            </li>
            <li>
              The pair may move together using either component's movement
              pattern. Both pieces arrive on the destination square.
            </li>
            <li>
              Kings cannot merge. Capturing a merged square captures both pieces
              on that square.
            </li>
          </ul>
          <Decision>
            A merge, split, or whole-pair move is illegal if it leaves your king
            in check. A pinned pair may therefore have fewer choices than its
            two movement patterns suggest.
          </Decision>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section
            id="pawns"
            className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm sm:p-7"
          >
            <h2 className="font-serif text-3xl tracking-tight">Pawns</h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground sm:text-base">
              <li>
                Pawns move one square forward. They do not get a two-square
                first move.
              </li>
              <li>
                Pawns capture one square diagonally, as in ordinary chess.
              </li>
              <li>
                A pawn may merge by moving one square forward onto a friendly,
                unmerged piece.
              </li>
              <li>There is no en passant.</li>
            </ul>
            <Decision>
              The two-square pawn move was removed because it creates ambiguous
              cases when a pawn is merged. With no two-square move, en passant
              has no trigger and is removed too.
            </Decision>
          </section>

          <section
            id="promotion"
            className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm sm:p-7"
          >
            <h2 className="font-serif text-3xl tracking-tight">Promotion</h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground sm:text-base">
              <li>
                A pawn that reaches the last rank promotes to a queen, rook,
                bishop, or knight.
              </li>
              <li>
                A pawn may split from a merged pair onto the last rank and
                promote. Its partner remains on the original square.
              </li>
              <li>
                If a pair containing a pawn moves together onto the last rank,
                promotion replaces both pieces with the selected piece.
              </li>
              <li>
                Moving only the non-pawn component onto the last rank does not
                trigger promotion.
              </li>
            </ul>
          </section>
        </div>

        <section
          id="castling"
          className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm sm:p-8"
        >
          <h2 className="font-serif text-3xl tracking-tight">Castling</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            The king and the original corner rook must still have castling
            rights. The path must be clear, and the king cannot castle out of,
            through, or into check.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-medium">The rook stays home</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Another piece may merge into the corner rook and later split
                away. The rook itself never moved, so castling rights remain.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-medium">The rook is still merged</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Castling is allowed. The king moves normally, and the whole rook
                pair moves to the rook's castling square.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-medium">The rook component moves</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Moving the rook alone or moving the whole pair from its corner
                permanently removes castling rights on that side.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-medium">The corner rook is captured</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Castling rights are lost even when the rook was one component of
                a captured pair.
              </p>
            </div>
          </div>
        </section>

        <section
          id="ending"
          className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm sm:p-8"
        >
          <h2 className="font-serif text-3xl tracking-tight">
            Check and game end
          </h2>
          <ul className="mt-5 grid gap-4 text-sm leading-6 text-muted-foreground sm:grid-cols-2 sm:text-base">
            <li>
              You cannot make any move that leaves your king in check. This
              includes splitting a pair and moving a pair together.
            </li>
            <li>
              The game records checkmate and stalemate. Challenges are untimed.
            </li>
            <li>
              The app does not currently adjudicate threefold repetition, the
              fifty-move rule, or insufficient material.
            </li>
          </ul>
        </section>

        <footer className="flex flex-wrap gap-3 pb-4">
          <Button asChild>
            <Link to="/practice">
              <FlaskConical aria-hidden="true" />
              Test a position
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to lobby</Link>
          </Button>
        </footer>
      </div>
    </div>
  );
}

function RuleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full border bg-card px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </a>
  );
}

function Decision({ children }: { children: ReactNode }) {
  return (
    <aside className="mt-6 border-l-4 border-primary bg-secondary/45 px-4 py-3">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-primary">
        ChessMerge ruling
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground">{children}</p>
    </aside>
  );
}

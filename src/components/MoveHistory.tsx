import { Move } from "../../lib/chessmerge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MoveHistoryProps {
  moves: Move[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const formatMove = (move: Move) => {
    const from = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
    const to = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;

    let moveText = `${from}-${to}`;

    if (move.capturedPieces && move.capturedPieces.length > 0) {
      moveText += " (capture)";
    }

    return moveText;
  };

  const groupedMoves = [];
  for (let i = 0; i < moves.length; i += 2) {
    groupedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Move History</CardTitle>
      </CardHeader>
      <CardContent>
        {moves.length === 0 ? (
          <p className="text-gray-500 text-sm">No moves yet</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <div className="space-y-1 text-sm">
              {groupedMoves.map((group) => (
                <div key={group.moveNumber} className="flex items-center gap-2">
                  <span className="text-gray-500 w-6 text-right">
                    {group.moveNumber}.
                  </span>
                  <span className="w-16 font-mono">
                    {formatMove(group.white)}
                  </span>
                  {group.black && (
                    <span className="w-16 font-mono">
                      {formatMove(group.black)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

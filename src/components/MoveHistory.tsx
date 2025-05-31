import { Move } from "../../convex/gameLogic";

interface MoveHistoryProps {
  moves: Move[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const formatMove = (move: Move, index: number) => {
    const fromSquare = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
    const toSquare = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
    
    let moveText = "";
    
    if (move.moveType === "merge") {
      moveText = `${fromSquare}+${toSquare}`;
    } else if (move.moveType === "unmerge") {
      moveText = `${fromSquare}÷${toSquare}`;
    } else {
      moveText = `${fromSquare}-${toSquare}`;
      if (move.capturedPiece) {
        moveText = `${fromSquare}x${toSquare}`;
      }
    }
    
    if (move.isCheckmate) {
      moveText += "#";
    } else if (move.isCheck) {
      moveText += "+";
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
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-3">Move History</h3>
      
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
                  {formatMove(group.white, (group.moveNumber - 1) * 2)}
                </span>
                {group.black && (
                  <span className="w-16 font-mono">
                    {formatMove(group.black, (group.moveNumber - 1) * 2 + 1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

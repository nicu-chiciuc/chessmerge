import { Routes, Route } from "react-router-dom";
import { GameLobby } from "./components/GameLobby";
import { ChessGameWrapper } from "./components/ChessGame";
import { UnsubscribePage } from "./components/UnsubscribePage";
import { useParams, useNavigate } from "react-router-dom";
import { Id } from "../convex/_generated/dataModel";
import { LocalPracticePage } from "./components/LocalPracticePage";

// Helper function to validate if a string is a valid Convex ID
function isValidConvexId(id: string): id is Id<"games"> {
  // Convex IDs are typically base64-encoded strings with a specific format
  // This is a basic check - in practice, you might want more robust validation
  return typeof id === "string" && id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id);
}

function GameRoute() {
  const { gameId } = useParams<{ gameId: string }>();

  if (!gameId) {
    return <div>Invalid game ID</div>;
  }

  if (!isValidConvexId(gameId)) {
    return <div>Invalid game ID format</div>;
  }

  return <ChessGameWrapper gameId={gameId} />;
}

function LobbyRoute() {
  const navigate = useNavigate();

  const handleJoinGame = (gameId: Id<"games">) => {
    void navigate(`/game/${gameId}`);
  };

  return <GameLobby onJoinGame={handleJoinGame} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LobbyRoute />} />
      <Route path="/game/:gameId" element={<GameRoute />} />
      <Route path="/practice" element={<LocalPracticePage />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
    </Routes>
  );
}

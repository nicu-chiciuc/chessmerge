import { Routes, Route } from "react-router-dom";
import { GameLobby } from "./components/GameLobby";
import { ChessGame } from "./components/ChessGame";
import { useParams, useNavigate } from "react-router-dom";
import { Id } from "../convex/_generated/dataModel";

function GameRoute() {
  const { gameId } = useParams<{ gameId: string }>();

  if (!gameId) {
    return <div>Invalid game ID</div>;
  }

  return <ChessGame gameId={gameId as Id<"games">} />;
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
    </Routes>
  );
}

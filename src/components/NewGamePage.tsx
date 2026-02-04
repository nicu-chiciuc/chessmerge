import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

interface NewGamePageProps {
  isAuthenticated?: boolean;
}

interface TimePreset {
  name: string;
  initialMinutes: number;
  incrementSeconds: number;
  category: "Bullet" | "Blitz" | "Rapid" | "Classical";
}

const TIME_PRESETS: TimePreset[] = [
  { name: "1+0", initialMinutes: 1, incrementSeconds: 0, category: "Bullet" },
  { name: "1+1", initialMinutes: 1, incrementSeconds: 1, category: "Bullet" },
  { name: "2+1", initialMinutes: 2, incrementSeconds: 1, category: "Bullet" },
  { name: "3+0", initialMinutes: 3, incrementSeconds: 0, category: "Blitz" },
  { name: "3+2", initialMinutes: 3, incrementSeconds: 2, category: "Blitz" },
  { name: "5+0", initialMinutes: 5, incrementSeconds: 0, category: "Blitz" },
  { name: "5+3", initialMinutes: 5, incrementSeconds: 3, category: "Blitz" },
  { name: "10+0", initialMinutes: 10, incrementSeconds: 0, category: "Rapid" },
  { name: "10+5", initialMinutes: 10, incrementSeconds: 5, category: "Rapid" },
  {
    name: "15+10",
    initialMinutes: 15,
    incrementSeconds: 10,
    category: "Rapid",
  },
  {
    name: "30+0",
    initialMinutes: 30,
    incrementSeconds: 0,
    category: "Classical",
  },
  {
    name: "30+20",
    initialMinutes: 30,
    incrementSeconds: 20,
    category: "Classical",
  },
];

const CATEGORY_COLORS = {
  Bullet: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
  Blitz: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
  Rapid: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
  Classical: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
};

const CATEGORY_COLORS_SELECTED = {
  Bullet: "bg-red-500 text-white border-red-600",
  Blitz: "bg-yellow-500 text-white border-yellow-600",
  Rapid: "bg-green-500 text-white border-green-600",
  Classical: "bg-blue-500 text-white border-blue-600",
};

export function NewGamePage({ isAuthenticated = false }: NewGamePageProps) {
  const navigate = useNavigate();
  const createGame = useMutation(api.gameLogic.createGame);

  const [selectedPreset, setSelectedPreset] = useState<TimePreset | null>(
    TIME_PRESETS[4], // Default to 3+2 Blitz
  );
  const [customMinutes, setCustomMinutes] = useState("10");
  const [customIncrement, setCustomIncrement] = useState("5");
  const [isCustom, setIsCustom] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectPreset = (preset: TimePreset) => {
    setSelectedPreset(preset);
    setIsCustom(false);
  };

  const handleCustomSelect = () => {
    setSelectedPreset(null);
    setIsCustom(true);
  };

  const handleCreateGame = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to create games");
      void navigate("/login");
      return;
    }

    let initialTimeMs: number;
    let incrementMs: number;

    if (isCustom) {
      const minutes = parseFloat(customMinutes);
      const seconds = parseFloat(customIncrement);
      if (isNaN(minutes) || minutes <= 0) {
        toast.error("Please enter a valid initial time");
        return;
      }
      if (isNaN(seconds) || seconds < 0) {
        toast.error("Please enter a valid increment");
        return;
      }
      initialTimeMs = minutes * 60 * 1000;
      incrementMs = seconds * 1000;
    } else if (selectedPreset) {
      initialTimeMs = selectedPreset.initialMinutes * 60 * 1000;
      incrementMs = selectedPreset.incrementSeconds * 1000;
    } else {
      toast.error("Please select a time control");
      return;
    }

    setIsCreating(true);
    try {
      const gameId = await createGame({ initialTimeMs, incrementMs });
      toast.success("Game created! Waiting for opponent...");
      void navigate(`/game/${gameId}`);
    } catch {
      toast.error("Failed to create game");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold text-primary mb-4">
          Create New Game
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <p className="text-blue-800">
            You need to sign in to create online games.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => void navigate("/login")}>Sign In</Button>
          <Button variant="outline" onClick={() => void navigate("/")}>
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Create New Game
        </h1>
        <p className="text-gray-600">Choose your time control</p>
      </div>

      {/* Time Presets */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Time Presets</h2>

        <div className="space-y-4">
          {(["Bullet", "Blitz", "Rapid", "Classical"] as const).map(
            (category) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TIME_PRESETS.filter((p) => p.category === category).map(
                    (preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleSelectPreset(preset)}
                        className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                          selectedPreset === preset && !isCustom
                            ? CATEGORY_COLORS_SELECTED[category]
                            : CATEGORY_COLORS[category]
                        }`}
                      >
                        {preset.name}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Custom Time Control */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Custom Time Control</h2>
          <Button
            variant={isCustom ? "default" : "outline"}
            size="sm"
            onClick={handleCustomSelect}
          >
            {isCustom ? "Custom Selected" : "Use Custom"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minutes">Initial Time (minutes)</Label>
            <Input
              id="minutes"
              type="number"
              min="1"
              max="180"
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value);
                setIsCustom(true);
                setSelectedPreset(null);
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="increment">Increment (seconds)</Label>
            <Input
              id="increment"
              type="number"
              min="0"
              max="60"
              value={customIncrement}
              onChange={(e) => {
                setCustomIncrement(e.target.value);
                setIsCustom(true);
                setSelectedPreset(null);
              }}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Selected Time Display */}
      <div className="bg-gray-50 rounded-lg border p-4 mb-6 text-center">
        <p className="text-sm text-gray-500 mb-1">Selected Time Control</p>
        <p className="text-2xl font-bold text-primary">
          {isCustom
            ? `${customMinutes}+${customIncrement}`
            : selectedPreset
              ? selectedPreset.name
              : "None selected"}
        </p>
        {selectedPreset && !isCustom && (
          <p className="text-sm text-gray-500 mt-1">
            {selectedPreset.category}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button
          size="lg"
          onClick={() => void handleCreateGame()}
          disabled={isCreating || (!selectedPreset && !isCustom)}
          className="px-8"
        >
          {isCreating ? "Creating..." : "Create Game"}
        </Button>
        <Button variant="outline" size="lg" onClick={() => void navigate("/")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

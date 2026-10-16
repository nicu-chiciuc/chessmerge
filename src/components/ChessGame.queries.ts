// The route's loader imports these options, so they live apart from the page
// component, which the router splits into a lazy chunk.
import { convexQuery } from "@convex-dev/react-query";

import { api } from "../../convex/_generated/api";

export const gameQuery = (gameId: string) =>
  convexQuery(api.gameLogic.getGame, { gameId });

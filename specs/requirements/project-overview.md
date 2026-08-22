# ChessMerge - Project Overview

## What is ChessMerge?

ChessMerge is a chess variant where pieces of the same color can **merge** together on the same square, creating combined pieces that move as a unit.

## Core Game Mechanics

### The Merge Mechanic

The defining feature of ChessMerge:

- **Any two same-color pieces (except kings) can occupy the same square**
- When a piece moves onto a friendly piece, they **merge** into a combined unit
- Merged pieces can move together OR split apart
- A merged piece can move if BOTH pieces can legally move to the destination
- Individual pieces within a merge can also move independently (unmerging)

**Example**: A knight merged with a bishop creates a piece that can move to any square reachable by either piece type.

### Pieces That Can Merge

| Piece 1  | Piece 2                     | Result              |
| -------- | --------------------------- | ------------------- |
| Pawn     | Any (except King)           | Combined pawn+piece |
| Rook     | Knight, Bishop, Queen, Pawn | Combined piece      |
| Knight   | Bishop, Queen, Pawn         | Combined piece      |
| Bishop   | Queen, Pawn                 | Combined piece      |
| Queen    | Pawn                        | Combined piece      |
| **King** | **Cannot merge**            | N/A                 |

### Move Types

1. **Base Move**: Standard chess move to empty or enemy-occupied square
2. **Merge Move**: Moving onto a friendly piece to combine
3. **Castle**: Standard castling (king cannot merge)

### Pawn Promotion

- Pawns promote on the back rank (standard chess rules)
- Merged pawns promote the pawn component
- Default promotion is to Queen

### Check & Checkmate

- Standard chess check/checkmate rules apply
- King must not be in check after any move
- Game ends when king is checkmated or stalemated

## Technical Architecture

### Frontend (TanStack Start + React + Vite)

```
src/
├── components/
│   ├── ChessBoard.tsx     # Board rendering, piece display, move visualization
│   ├── ChessGame.tsx      # Game state management, move handling
│   ├── GameLobby.tsx      # Game creation, joining, listing
│   ├── GameInfo.tsx       # Player info, game status
│   ├── GameTimer.tsx      # Time control display
│   ├── MoveHistory.tsx    # Move notation display
│   └── EmailSubscribe.tsx # Newsletter signup
├── pages/
│   └── LoginPage.tsx      # Authentication page
├── routes/                # Typed TanStack Router file routes
├── router.tsx             # Router construction and registration
└── pieces/                # SVG piece assets
```

### Backend (Convex)

```
convex/
├── gameLogic.ts           # Game mutations & queries
├── auth.ts                # Authentication config
├── emails.ts              # Email sending
└── schema.ts              # Database schema
```

### Shared Logic

```
lib/
├── chessmerge.ts          # Core game rules, move generation, board state
├── types.ts               # Shared TypeScript types
└── utils.ts               # Utility functions
```

## Game Modes

### 1. Online Multiplayer

- Create games and wait for opponents
- Real-time synchronization via Convex
- Time controls (initial time + increment)
- Rated games (future)

### 2. Practice Mode

- Play both sides
- Edit board state directly
- Test positions and strategies

### 3. Local Practice

- Offline mode without authentication
- Play against yourself locally

## Game State Representation

### Board Structure

```typescript
type Cell = Piece[]; // 0-2 pieces per cell
type Board = Cell[][]; // 8x8 grid

interface Piece {
  color: "w" | "b";
  pieceType: "p" | "r" | "n" | "b" | "q" | "k";
}
```

### FEMN Notation

ChessMerge uses **FEMN** (FEN for Merge Notation):

- Similar to FEN but supports merged pieces
- Merged pieces use `:` separator (e.g., `r:n` for rook+knight)
- Example: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`

## Authentication

- Powered by Convex Auth
- Verified email/password authentication with password reset
- Anonymous browsing supported (view-only for multiplayer)

## Time Controls

- Configurable initial time (in milliseconds)
- Configurable increment per move
- Server-side timeout detection
- Real-time countdown display

## Current Features

- [x] Core merge mechanics
- [x] All standard chess moves
- [x] Castling
- [x] Pawn promotion
- [x] Check/checkmate detection
- [x] Online multiplayer
- [x] Practice mode with board editing
- [x] Time controls
- [x] Move history
- [x] Real-time game sync
- [x] Authentication
- [x] Email subscription

## Known Limitations

- No en passant (intentionally removed for simplicity)
- No draw offers
- No spectator mode
- No game analysis/review
- No AI opponent

## Technology Stack

| Layer         | Technology                                 |
| ------------- | ------------------------------------------ |
| Frontend      | TanStack Start, React 19, Vite, TypeScript |
| Styling       | Tailwind CSS 4                             |
| Backend       | Convex (serverless)                        |
| Auth          | Convex Auth                                |
| UI Components | Radix UI, shadcn/ui                        |
| Routing       | TanStack Router                            |
| Notifications | Sonner                                     |
| Email         | Cloudflare Email Sending                   |
| Unit Testing  | Vitest                                     |
| E2E Testing   | Playwright                                 |

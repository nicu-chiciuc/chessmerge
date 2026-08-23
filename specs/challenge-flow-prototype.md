# Challenge flow prototype

This disposable prototype starts from main v120 at `54ad4a6`. It only covers the
shareable challenge handoff. It does not implement auth, game state, chess
moves, clocks, reconnect, results, or rematches.

## Run it

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory prototypes/challenge-flow
```

Open `http://127.0.0.1:4173/`. The header switcher and these query URLs expose
the five review states:

- `?view=create`
- `?view=waiting`
- `?view=join`
- `?view=joined`
- `?view=unavailable`

## Settled UX decisions

- Challenge creation is casual and untimed. The screen has one action,
  `Create challenge`.
- The waiting screen centers the open opponent seat and share link. Copy, Share,
  and Cancel challenge remain visible.
- Cancellation uses an inline confirmation before the link closes.
- A recipient sees the board, casual format, untimed format, creator seat, and
  open guest seat before joining.
- The only recipient action is `Join as guest`.
- A successful join lands at the game boundary. This prototype shows a static
  board and stops there.
- Expired, canceled, full, or otherwise unusable links share one generic
  `Challenge unavailable` screen.
- Boards are inert markup. Visible square coordinates and `data-square`
  attributes keep browser review legible without implying move behavior.
- State changes move keyboard focus to the next primary control. The Joined
  state focuses its heading because it has no action.

## Unresolved backend behavior

- Define the challenge token, canonical URL, expiry, cancellation, and
  authorization rules. The fixed `amber-rook` URL is illustrative.
- Decide whether a waiting challenge remains open after the creator closes the
  page. The UI makes no persistence claim.
- Define the anonymous guest session and seat ownership rules across refresh,
  browser restart, and multiple devices.
- Make seat claiming atomic. Specify what the join call returns when cancel and
  join race, or when two guests race for one seat.
- Decide when a challenge becomes a game and which route or record the join
  response returns.
- Decide whether the backend returns specific unavailable reasons. The MVP UI
  does not depend on them.
- Make cancellation idempotent and define whether the creator can reopen a
  canceled challenge.
- Decide which pre-join details are public. The prototype only shows the format,
  board preview, and seat labels.

## Prototype boundary

The header switcher, fixed link, fixed board position, toast feedback, and
static Joined destination are review aids. They are not production architecture.
Game controls belong to the later game UI task.

Browser QA screenshots live in `prototypes/challenge-flow/screenshots/`.

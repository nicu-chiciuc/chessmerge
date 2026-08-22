# ChessMerge repository instructions

## Main build labels

- Use squash merge for pull requests into `main`.
- Merge pull requests into `main` one at a time. Do not start concurrent merges.
- After rebasing a pull request branch onto the latest `origin/main`, run
  `node ./scripts/pr-build-label.ts` to refresh its `v<N>:` title.
- Run the title script again immediately before squash merge. Another pull request may have changed
  the projected number since the previous refresh.
- Keep ordinary branch commit subjects unversioned. The pull request title becomes the final squash
  commit subject on `main`.

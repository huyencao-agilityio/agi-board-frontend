---
name: create-pr
description: Creates a pull request (GitHub) or merge request (GitLab) for this repo with the team format - title is the exact name of the Trello card, description has Ticket / What / Why / How tested / Screenshots / Risk. Use whenever the user asks to create, open or raise a pull request, PR, merge request or MR, or to "push and open a PR", even if they do not mention Trello or the format.
---

# Create a PR / MR

Every PR/MR is tied to one Trello card. The card number (`#123`, the number Trello shows on the card) is the ticket ID used everywhere: branch, commits (`feat(boards): #123 Add route guards`), PR title source and the Ticket link.

## 1. Find the ticket

Take the card number from, in order:

1. What the user said (`#123`, a Trello card URL).
2. The commits on this branch: `git log --format=%s <base>..HEAD` and take the `#123` after `<type>(<scope>): `.
3. The branch name (e.g. `feature/123-board-guards`).

If none gives exactly one number, or different sources disagree, ask the user. Never guess.

## 2. Read the card from Trello

Use the Trello MCP tools (`trelloReadCard`, `trelloSearch`, `trelloReadBoard`) to find the card with that number and read its **name** and **URL** (`shortUrl`). A card number is unique only inside one board: if the board is not known, ask the user which board (or for the card URL) and use it.

If Trello is not connected or the card cannot be found, stop and ask the user for the card name and URL. Do not invent them.

## 3. Check the branch before opening

- Base branch: the repo default (`main`) unless the user says otherwise.
- Never open a PR from `main`/`master` or another protected branch; create a feature branch first.
- Every commit subject on the branch must be `<type>(<scope>): #<number> <Imperative summary>` with this card's number (team rule). If one does not, tell the user and offer to fix it instead of opening the PR.
- Run `pnpm lint && pnpm typecheck && pnpm test` and use the real results in "How tested". If something fails, say so; do not hide it.
- Push the branch (no force push).

## 4. Title and description

**Title:** the Trello card name, copied exactly (same words, same case, no ticket prefix added, nothing translated). If the card name is empty, ask.

**Description:** use this template; every heading stays even when a section is short. Write it for reviewers: concrete, no filler.

```markdown
## Ticket

[#<number> <card name>](<card shortUrl>)

## What

<What changed, as a short list of user-visible or code-level changes.>

## Why

<The problem or ticket requirement this solves. Link the spec/screen ID if relevant, e.g. WEB-07.>

## How tested

- [x] `pnpm lint` / `pnpm typecheck` / `pnpm test` (state the actual result)
- [ ] <Manual steps a reviewer can repeat: route, account role, expected result>

## Screenshots

<Before/after for UI changes. Write "N/A (no UI change)" otherwise. If UI changed and you could not capture one, say "To add" so the author attaches it.>

## Risk

<What could break, who is affected, how to roll back. "Low: ..." is fine when true.>
```

## 5. Create it

- Remote on GitHub (`git remote -v` shows github.com): `gh pr create --base <base> --title "<card name>" --body-file <tmp file>`.
- Remote on GitLab: use the GitLab MCP `create_merge_request` (or `glab mr create`) with the same title and description.
- Write the body to a temp file and pass it as a file, so quotes and backticks in the text are not mangled by the shell.

Then give the user the PR/MR link, the title used and the ticket link. Do not merge.

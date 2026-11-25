# Quickstart: validate #53

## Before merge

1. `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`: pass.

The `claude-review` job on this PR is expected to pass without reviewing, because its workflow file differs from
`develop`.

## After merge

Prerequisite: the `CLAUDE_CODE_OAUTH_TOKEN` secret and the Claude GitHub App, both set up in #47.

| #   | Do                                                                                           | Expect                                                                                                      |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Open a draft PR into `develop` with deliberate bugs in two files                             | The review starts by itself; inline comments by `claude[bot]` on the right lines, with severity; no summary |
| 2   | Push another commit without fixing the bugs                                                  | The same problems are not posted again                                                                      |
| 3   | Push twice within a minute                                                                   | The first run is cancelled                                                                                  |
| 4   | After the review ends, push a new bug and comment `@claude review` when its review has ended | No duplicate inline comments; any new finding is inline. The tracking comment may list findings             |
| 5   | Open a small clean PR                                                                        | Nothing is posted; the job log lists the reviewed files                                                     |
| 6   | Open a PR with a diff over 70 KB                                                             | The job log lists every changed file except lock files                                                      |

A missed bug in scenario 1 is a model limit, not a workflow failure, as long as the comments posted are inline. Close the
test PRs without merging.

# Feature Specification: #53 Post automatic Claude code review as inline PR comments in the frontend

**Card:** https://trello.com/c/23LvbjT1/53-post-automatic-claude-code-review-as-inline-pr-comments-in-the-frontend
**List (status):** In Progress
**Labels:** Phase 3, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-25 (Asia/Saigon)

---

## Description

# Post automatic Claude code review as inline PR comments in the frontend

## Overview

The automatic review set up in ticket #47 runs on every frontend PR into `develop`, but reviews too little of the change. On PR #14 the 70 KB diff was cut to a 2 KB preview, and Claude reported that it did not open the test files, `SignUpPage.tsx` or `password-rules.ts`. On PR #12 the same problem was posted three times. `@claude review` returns only a summary, because `claude.yml` does not allow the inline comment tool. Same fix as ticket #52 for the backend.

## Scope

- `claude-code-review.yml`: use a review prompt based on `AGENTS.md`, `.claude/rules/` and the `react-reviewer` agent
- `claude-code-review.yml`: check out the PR head, so line numbers match the diff on GitHub
- `claude-code-review.yml`: save the full diff and the existing inline comments to files before the review, so the diff is not truncated
- `claude-code-review.yml`: post each finding as an inline comment on its line; no summary comment
- `claude-code-review.yml`: skip findings already reported by an inline comment, and cancel a running review when a new commit is pushed
- `claude-code-review.yml`: limit the tools of the review session, read only comments by Claude and the team, and replace `show_full_output` with a step that prints only the final message
- `claude.yml`: allow inline comments for `@claude review`
- Out of scope: the backend repo, blocking the merge on findings, and removing the tracking comment that the action posts for `@claude` mentions

## Acceptance Criteria

- **Given** a PR into `develop` is opened, updated, reopened or marked ready for review, **When** the workflow runs, **Then** the review starts without an `@claude` mention.
- **Given** the review finds a problem, **When** it finishes, **Then** the problem is an inline comment on the changed line, with its severity, impact and fix.
- **Given** the review finds several problems, **When** it finishes, **Then** each one has its own inline comment and no summary comment is posted.
- **Given** the review finds no problem, **When** it finishes, **Then** nothing is posted and the job log lists the reviewed files.
- **Given** a large diff, **When** the review runs, **Then** every changed file except lock files is reviewed.
- **Given** an existing inline comment already reports a problem, **When** a new commit is pushed, **Then** the same problem is not posted again.
- **Given** a user comments `@claude review` on a PR, **When** Claude replies, **Then** new findings are inline comments; the tracking comment may also list them.

## Verification

`claude-code-action` skips a PR whose workflow file differs from the one on `develop`. After merge, open a new PR with a deliberate bug and check that the inline comment is on the right line.

---

## Acceptance Criteria

- [ ] **Given** a PR into `develop` is opened, updated, reopened or marked ready for review, **When** the workflow runs, **Then** the review starts without an `@claude` mention.
- [ ] **Given** the review finds a problem, **When** it finishes, **Then** the problem is an inline comment on the changed line, with its severity, impact and fix.
- [ ] **Given** the review finds several problems, **When** it finishes, **Then** each one has its own inline comment and no summary comment is posted.
- [ ] **Given** the review finds no problem, **When** it finishes, **Then** nothing is posted and the job log lists the reviewed files.
- [ ] **Given** a large diff, **When** the review runs, **Then** every changed file except lock files is reviewed.
- [ ] **Given** an existing inline comment already reports a problem, **When** a new commit is pushed, **Then** the same problem is not posted again.
- [ ] **Given** a user comments `@claude review` on a PR, **When** Claude replies, **Then** new findings are inline comments; the tracking comment may also list them.

---

## Checklists

None

## Comments

None

## Attachments / Links

None

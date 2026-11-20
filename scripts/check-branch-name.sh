#!/bin/sh
# Branch names: <type>/<kebab-slug>, e.g. feat/init-structure, fix/board-404. main and develop are exempt.
# Used by .husky/pre-push and CI. Usage: check-branch-name.sh [branch]
branch=${1:-$(git rev-parse --abbrev-ref HEAD)}
case "$branch" in main | develop) exit 0 ;; esac
if ! echo "$branch" | grep -Eq '^(feat|fix|chore|refactor|test|docs|build|ci|perf|hotfix|release)/[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "Branch '$branch' does not match <type>/<kebab-slug> (e.g. feat/init-structure, fix/board-404)." >&2
  exit 1
fi

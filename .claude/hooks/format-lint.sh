#!/usr/bin/env bash
# PostToolUse hook: prettier (+ eslint for code) on edited react/markdown files.
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file=$(jq -r '.tool_input.file_path // empty')

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0
case "$file" in "$root"/*) ;; *) exit 0 ;; esac

bin="$root/node_modules/.bin"
cd "$root" || exit 0

case "$file" in
  *.tsx|*.jsx|*.ts|*.js)
    "$bin/prettier" --write "$file" >/dev/null 2>&1
    out=$("$bin/eslint" --fix "$file" 2>&1) || {
      echo "$out" >&2
      exit 2
    }
    ;;
  *.md|*.mdx)
    "$bin/prettier" --write "$file" >/dev/null 2>&1
    ;;
esac
exit 0

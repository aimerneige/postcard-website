#!/bin/bash
set -e

info() {
  printf "\033[0;32m$1\033[0m\n"
}

err() {
  printf "\033[0;31m$1\033[0m\n"
}

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

cd "$ROOT_DIR"

# Determine data source: use D1 if --d1 flag is passed, otherwise use local SQLite
USE_D1=false
for arg in "$@"; do
  if [[ "$arg" == "--d1" ]]; then
    USE_D1=true
    break
  fi
done

info "Deploying updates to GitHub..."

if [[ -d "$ROOT_DIR/dist" ]]; then
  info "Deleting old dist directory..."
  rm -rf "$ROOT_DIR/dist/"
fi

if [[ "$USE_D1" == true ]]; then
  info "Compiling gallery data from Cloudflare D1..."
  npx tsx scripts/compile-d1.ts
else
  info "Generating static files from local SQLite database..."
fi

info "Building Vite static bundle..."
npm run build

info "Pushing to github..."
cd dist
if [ ! -d .git ]; then
  git init --initial-branch=master
fi
git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:aimerneige/postcard.aimer.moe.git
git add -A
msg="update site $(date)"
if [ -n "$1" ] && [[ "$1" != "--d1" ]]; then
  msg="$1"
fi
git commit -m "$msg"
git push -f origin master

info "DONE. Removing dist..."

if [[ -d "$ROOT_DIR/dist" ]]; then
  rm -rf "$ROOT_DIR/dist/"
fi

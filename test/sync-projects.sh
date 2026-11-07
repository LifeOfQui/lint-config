#!/usr/bin/env bash
# Copies sample files from the sibling projects that use this package into test/fixture/**/_local/
# (gitignored: the projects are private), so `npm test` also lints real code. Run it with the
# version you update from: it formats and fixes the samples with that version and drops the ones
# that still fail, so `npm test` starts green and an update only shows what it changes.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
fixture=$root/test/fixture
dirs=(app/pages app/layouts app/components app/composables app/utils server shared tests)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

tarball=$(cd "$root" && npm pack --silent --pack-destination "$work")
mkdir "$work/project"
cp -R "$fixture/." "$work/project"
find "$work/project" -type d -name _local -prune -exec rm -rf {} +

# The colon matches the dependency entry, not the "name" of this package
for pkg in "$root"/../*/package.json "$root"/../*/*/package.json; do
  grep -q '"@lifeofqui/lint-config":' "$pkg" 2> /dev/null || continue
  project=$(dirname "$pkg")
  name=$(basename "$project")
  for dir in "${dirs[@]}"; do
    # The largest file per folder: the most syntax for one file
    file=$(cd "$project" && git ls-files -z -- "$dir/*.vue" "$dir/*.ts" | xargs -0 -r ls -S | head -n 1) || true
    [[ -n $file ]] || continue
    dest=$work/project/$dir/_local/$name/${file#"$dir"/}
    mkdir -p "$(dirname "$dest")"
    cp "$project/$file" "$dest"
  done
done

cd "$work/project"
npm install --save-dev --no-audit --no-fund --silent "$work/$tarball"

# Bring project conventions (arrowParens, block order, …) to the shared defaults
node_modules/.bin/oxlint . --fix > /dev/null || true
node_modules/.bin/eslint . --fix > /dev/null || true
node_modules/.bin/oxfmt > /dev/null

# Drop samples that still fail: they rely on a rule override of their project
{
  node_modules/.bin/oxlint . --deny-warnings --format unix || true
  node_modules/.bin/eslint . --format json \
    | node -e 'for (const r of JSON.parse(require("fs").readFileSync(0))) if (r.messages.length) console.log(r.filePath)' \
    || true
} | grep -o '^[^:]*/_local/[^:]*' | sort -u | while read -r file; do
  echo "Dropped ${file#"$(pwd -P)"/}"
  rm "$file"
done

# What remains must pass, as in test/smoke.sh
node_modules/.bin/oxfmt --check
node_modules/.bin/oxlint . --deny-warnings
node_modules/.bin/eslint . --max-warnings 0

find "$fixture" -type d -name _local -prune -exec rm -rf {} +
find . -path ./node_modules -prune -o -type d -name _local -prune -print | tar -cf - -T - | tar -xf - -C "$fixture"
echo "Synced $(find "$fixture" -path '*/_local/*' -type f | wc -l | tr -d ' ') files into test/fixture/**/_local/"

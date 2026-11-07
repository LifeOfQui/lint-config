#!/usr/bin/env bash
# Packs this package, installs the tarball into a copy of test/fixture and runs all three tools
# there, the way a consuming project does.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# Fails unless the command exits non-zero and reports the given rule
expect_rule() {
  local rule=$1 output
  shift
  if output=$("$@" 2>&1); then
    echo "Expected '$*' to report $rule, but it passed" >&2
    exit 1
  fi
  if ! grep -q "$rule" <<< "$output"; then
    echo "$output" >&2
    echo "Expected '$*' to report $rule" >&2
    exit 1
  fi
}

tarball=$(cd "$root" && npm pack --silent --pack-destination "$work")
mkdir "$work/project"
cp -R "$root/test/fixture/." "$work/project"
cd "$work/project"
npm install --save-dev --no-audit --no-fund "$work/$tarball"

# The project scripts call the binaries directly, so they must be hoisted
for bin in eslint oxlint oxfmt; do
  if [[ ! -x node_modules/.bin/$bin ]]; then
    echo "node_modules/.bin/$bin is missing" >&2
    exit 1
  fi
done

# The fixture uses single quotes and no semicolons, so this also proves the shared config is loaded
node_modules/.bin/oxfmt --check
node_modules/.bin/oxlint . --deny-warnings
node_modules/.bin/eslint . --max-warnings 0

# The shared rules must actually apply: each linter has to reject a known violation
printf 'export enum Color {\n  Red,\n}\n' > app/utils/color.ts
expect_rule no-restricted-syntax node_modules/.bin/eslint app/utils/color.ts
printf "export function fail() {\n  throw Error('fail')\n}\n" > app/utils/fail.ts
expect_rule throw-new-error node_modules/.bin/oxlint app/utils/fail.ts
printf '<template>\n  <img src="/logo.png" />\n</template>\n' > app/components/Logo.vue
expect_rule vuejs-accessibility/alt-text node_modules/.bin/eslint app/components/Logo.vue

echo "Smoke test passed"

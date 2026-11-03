# @lifeofqui/lint-config

Gemeinsames Lint- und Format-Setup für Vue-/Nuxt-Projekte: **Oxlint** für JS/TS, **ESLint** nur für das, was Oxlint nicht kann (Vue-Templates/SFCs, AST-Selector-Regeln), **Oxfmt** zum Formatieren.

Das Paket bringt Regeln **und** Tool-Versionen mit: `eslint`, `oxlint` und `oxfmt` sind exakt gepinnte Dependencies. Ein Update dieses Pakets aktualisiert also Regeln und Tools in einem Schritt.

> Node `>= 22.18` · npm (die Binaries werden nach `node_modules/.bin` gehoistet)

## Setup in einem Projekt

Zuerst die bisherigen Lint-Pakete deinstallieren, **dann** das Paket installieren (zwei getrennte Befehle):

```bash
npm uninstall eslint oxlint oxfmt eslint-plugin-oxlint eslint-plugin-vue @vue/eslint-config-typescript eslint-config-prettier @vue/eslint-config-prettier @nuxt/eslint
```

```bash
npm i -D @lifeofqui/lint-config
```

Die Reihenfolge ist wichtig: Liegt beim Install noch eine andere Version von `oxfmt`, `oxlint` oder `eslint` im Projekt, legt npm die mitgelieferte Version verschachtelt unter `node_modules/@lifeofqui/lint-config/node_modules/` ab und das Binary fehlt in `node_modules/.bin`. Prüfen mit `ls node_modules/.bin | grep -E '^(eslint|oxlint|oxfmt)$'`. Falls doch passiert: `npm uninstall @lifeofqui/lint-config` und neu installieren. `npm dedupe` hilft hier nicht.

Ist `@nuxt/eslint` auch in `modules` der `nuxt.config.ts` eingetragen, den Eintrag dort ebenfalls entfernen.

**`.oxlintrc.json`**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/@lifeofqui/lint-config/oxlintrc.json"],
  "ignorePatterns": ["public"]
}
```

`ignorePatterns` wird von Oxlint **nicht** über `extends` vererbt und bleibt deshalb im Projekt. `categories`, `plugins`, `rules` und `overrides` kommen aus der Basis.

**`oxfmt.config.ts`** (Oxfmt kennt kein `extends`, daher Spread)

```ts
import base from '@lifeofqui/lint-config/oxfmt'

export default { ...base }
```

**`eslint.config.mjs`**

```js
import { defineLintConfig } from '@lifeofqui/lint-config/eslint'

export default defineLintConfig()
```

Optionen von `defineLintConfig`:

| Option             | Default              | Zweck                                                                                                                                                    |
| ------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ignores`          | `[]`                 | Zusätzliche Ignore-Globs (Nuxt-Build-Ordner sind schon drin)                                                                                             |
| `oxlintConfigFile` | `'./.oxlintrc.json'` | Oxlint-Config des Projekts, deren Regeln ESLint abschaltet                                                                                               |
| `gitignore`        | `'.gitignore'`       | Ignore-Datei (relativ zum Arbeitsverzeichnis), deren Muster ESLint überspringt, wie Oxlint und Oxfmt. Fehlt sie, passiert nichts; `false` schaltet es ab |
| `configs`          | `[]`                 | Projektspezifische Flat-Configs, werden nach den geteilten angewendet                                                                                    |

**Scripts** (Standard, `npm-run-all` im Projekt)

```json
{
  "fmt": "oxfmt",
  "fmt:check": "oxfmt --check",
  "lint": "run-s --continue-on-error fmt lint:oxlint lint:eslint",
  "lint:check": "run-s --continue-on-error fmt:check lint:check:oxlint lint:check:eslint",
  "lint:check:eslint": "eslint . --cache --max-warnings 0",
  "lint:check:oxlint": "oxlint . --deny-warnings",
  "lint:eslint": "eslint . --fix --cache --max-warnings 0",
  "lint:oxlint": "oxlint . --fix --fix-suggestions --deny-warnings"
}
```

## Projektspezifische Anpassungen

- **Oxlint**: eigene `rules` / `overrides` in `.oxlintrc.json` nach dem `extends`. Spätere Einträge gewinnen.
- **Oxfmt**: `export default { ...base, printWidth: 120 }`, zusätzliche Ignores mit `ignorePatterns: [...base.ignorePatterns, 'datei.json']`
- **ESLint**: `defineLintConfig({ configs: [{ files: ['…'], rules: { … } }] })`

## Updates verteilen

Tool-Updates kommen per Dependabot (`.github/dependabot.yml`): wöchentlich ein gesammelter PR für alle Minor- und Patch-Updates, Majors als eigene PRs. Regeländerungen werden direkt hier gemacht. Tool-Versionen immer exakt pinnen.

1. Die CI prüft jeden PR mit `npm test` (`test/smoke.sh`). Das Skript packt das Paket, installiert es in eine Kopie von `test/fixture` und prüft, dass `eslint`, `oxlint` und `oxfmt` in `node_modules/.bin` liegen. Dann laufen alle drei Tools über das Fixture, und Oxlint und ESLint müssen je einen bekannten Verstoß melden.
2. Bei größeren Änderungen zusätzlich in einem echten Projekt testen: `npm pack`, dort `npm i -D ../lint-config/lifeofqui-lint-config-<version>.tgz`, dann `npm run lint:check` und `npm run build`.
3. Nach dem Merge lokal auf `main`: `npm version patch|minor|major` und `git push --follow-tags`. Der Tag startet `.github/workflows/publish.yml`. Der Workflow lässt `npm test` laufen und legt die Version dann per npm Trusted Publishing als Staged Publish ab.
4. Freigeben: auf npmjs.com im Tab „Staged Packages“ auf Approve klicken, oder `npm stage approve <stage-id>` (beides mit 2FA). Erst dann ist die Version live.
5. In den Projekten öffnet Dependabot einen PR, die CI prüft ihn mit `npm run lint:check`.

Einmalig auf npmjs.com einrichten: Paket → Settings → Trusted Publisher → GitHub Actions mit Owner `LifeOfQui`, Repository `lint-config` und Workflow `publish.yml`. „Allow npm publish“ bleibt aus, damit jede Version die Freigabe mit 2FA braucht.

Semver: neue oder verschärfte Regeln und Tool-Updates mit Formatierungsänderungen → `minor`, Lockerungen und Fixes → `patch`, geänderte Datei-Struktur oder Optionen → `major`.

## Stolperfalle: Inline-Handler mit mehreren Anweisungen

Oxfmt entfernt mit `semi: false` das `;` aus Vue-Handlern wie `@click="a = 1; b = 2"` und schreibt die Anweisungen untereinander. Der Vue-Compiler erkennt mehrere Anweisungen aber nur am `;` und bricht dann den **Build** ab („Error parsing JavaScript expression“). Lint und Typecheck merken davon nichts.

Deshalb keine Inline-Handler mit mehreren Anweisungen schreiben, sondern eine Funktion aufrufen (`@click="resetFilters"`). Nach einer Umstellung auf dieses Paket immer auch `npm run build` laufen lassen.

## Hinweis zu eslint-plugin-oxlint

`eslint-plugin-oxlint` übernimmt bei `extends` keine `categories`. `defineLintConfig` liest deshalb zusätzlich die Basis-Datei direkt ein, damit ESLint alle Regeln abschaltet, die Oxlint über Kategorien abdeckt.

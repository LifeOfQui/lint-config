# @lifeofqui/lint-config

Gemeinsames Lint- und Format-Setup für Vue-/Nuxt-Projekte: **Oxlint** für JS/TS, **ESLint** nur für das, was Oxlint nicht kann (Vue-Templates/SFCs, AST-Selector-Regeln), **Oxfmt** zum Formatieren.

Das Paket bringt Regeln **und** Tool-Versionen mit: `eslint`, `oxlint` und `oxfmt` sind exakt gepinnte Dependencies. Ein Update dieses Pakets aktualisiert also Regeln und Tools in einem Schritt.

> Node `>= 22.18` · npm (die Binaries werden nach `node_modules/.bin` gehoistet)

## Setup in einem Projekt

```bash
npm i -D @lifeofqui/lint-config
```

`eslint`, `oxlint`, `oxfmt`, `eslint-plugin-oxlint`, `eslint-plugin-vue`, `@vue/eslint-config-typescript` und `eslint-config-prettier` aus den devDependencies des Projekts entfernen.

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

| Option             | Default              | Zweck                                                                 |
| ------------------ | -------------------- | --------------------------------------------------------------------- |
| `ignores`          | `[]`                 | Zusätzliche Ignore-Globs (Nuxt-Build-Ordner sind schon drin)          |
| `oxlintConfigFile` | `'./.oxlintrc.json'` | Oxlint-Config des Projekts, deren Regeln ESLint abschaltet            |
| `configs`          | `[]`                 | Projektspezifische Flat-Configs, werden nach den geteilten angewendet |

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
- **Oxfmt**: `export default { ...base, printWidth: 120 }`
- **ESLint**: `defineLintConfig({ configs: [{ files: ['…'], rules: { … } }] })`

## Updates verteilen

1. Regel oder Tool-Version hier ändern (Tool-Versionen immer exakt pinnen).
2. Lokal testen: `npm pack`, im Projekt `npm i -D ../lint-config/lifeofqui-lint-config-<version>.tgz`, dann `npm run lint:check`.
3. `npm version patch|minor|major` und danach `npm publish`.
4. In den Projekten öffnet Dependabot einen PR (`.github/dependabot.yml`), die CI prüft ihn mit `npm run lint:check`.

Semver: neue oder verschärfte Regeln und Tool-Updates mit Formatierungsänderungen → `minor`, Lockerungen und Fixes → `patch`, geänderte Datei-Struktur oder Optionen → `major`.

## Hinweis zu eslint-plugin-oxlint

`eslint-plugin-oxlint` übernimmt bei `extends` keine `categories`. `defineLintConfig` liest deshalb zusätzlich die Basis-Datei direkt ein, damit ESLint alle Regeln abschaltet, die Oxlint über Kategorien abdeckt.

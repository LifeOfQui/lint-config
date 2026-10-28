import type { Linter } from 'eslint'

export interface LintConfigOptions {
  /** Extra ignore globs, added to the Nuxt build output dirs. */
  ignores?: string[]
  /** Oxlint config whose rules ESLint turns off. Defaults to `./.oxlintrc.json`. */
  oxlintConfigFile?: string
  /** Project-specific flat configs, applied after the shared ones. */
  configs?: Linter.Config[]
}

export declare function defineLintConfig(options?: LintConfigOptions): Linter.Config[]

import type { Linter } from 'eslint'

export interface LintConfigOptions {
  /** Extra ignore globs, added to the Nuxt build output dirs. */
  ignores?: string[]
  /** Oxlint config whose rules ESLint turns off. Defaults to `./.oxlintrc.json`. */
  oxlintConfigFile?: string
  /**
   * Ignore file whose patterns ESLint skips, relative to the working directory. Defaults to
   * `.gitignore`; skipped silently if missing. `false` turns it off.
   */
  gitignore?: string | false
  /** Project-specific flat configs, applied after the shared ones. */
  configs?: Linter.Config[]
}

export declare function defineLintConfig(options?: LintConfigOptions): Linter.Config[]

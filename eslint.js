import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import { includeIgnoreFile } from 'eslint/config'
import skipFormatting from 'eslint-config-prettier'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginVue from 'eslint-plugin-vue'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const baseOxlintConfigFile = fileURLToPath(new URL('./oxlintrc.json', import.meta.url))

const defaultIgnores = ['**/.output', '**/.data', '**/.nuxt', '**/.nitro', '**/.cache', '**/dist']

/**
 * ESLint only covers what Oxlint can't: Vue templates / SFCs and AST-selector rules.
 * Everything else (incl. unicorn and import rules) lives in the Oxlint config.
 *
 * @param {object} [options]
 * @param {string[]} [options.ignores] Extra ignore globs, added to the Nuxt build output dirs.
 * @param {string} [options.oxlintConfigFile] Oxlint config whose rules ESLint turns off.
 * @param {string | false} [options.gitignore] Ignore file whose patterns ESLint skips, relative to the
 *   working directory. Skipped silently if missing; `false` turns it off.
 * @param {object[]} [options.configs] Project-specific flat configs, applied after the shared ones.
 */
export function defineLintConfig({
  ignores = [],
  oxlintConfigFile = './.oxlintrc.json',
  gitignore = '.gitignore',
  configs = [],
} = {}) {
  const gitignoreFile = gitignore === false ? null : resolve(gitignore)

  return [
    // Lint the same files as Oxlint and Oxfmt, which both respect .gitignore
    ...(gitignoreFile && existsSync(gitignoreFile)
      ? [
          includeIgnoreFile(gitignoreFile, {
            gitignoreResolution: true,
            name: 'lifeofqui/gitignore',
          }),
        ]
      : []),

    ...defineConfigWithVueTs(
      { ignores: [...defaultIgnores, ...ignores] },

      pluginVue.configs['flat/recommended'],
      vueTsConfigs.recommended,

      // Project defaults
      {
        rules: {
          '@typescript-eslint/no-explicit-any': 'off',
          'vue/multi-word-component-names': 'off',
          // Optional type-based props are undefined when omitted; explicit `undefined` defaults add noise.
          'vue/require-default-prop': 'off',
          // Oxlint covers .ts files; in .vue files ESLint keeps this rule because it sees template usage.
          '@typescript-eslint/no-unused-vars': [
            'error',
            { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
          ],
          'no-restricted-syntax': [
            'error',
            {
              selector: 'TSEnumDeclaration',
              message: 'Use literal unions instead of enums.',
            },
          ],
        },
      },

      // Vue component rules (template / SFC — not yet covered by oxlint)
      {
        files: ['app/**/*.vue'],
        rules: {
          'vue/component-name-in-template-casing': ['error', 'PascalCase'],
          'vue/block-order': [
            'error',
            {
              order: ['script', 'template', 'style'],
            },
          ],
          'vue/custom-event-name-casing': [
            'warn',
            'kebab-case',
            // Idiomatic Vue v-model event names; renaming them would fight the ecosystem.
            { ignores: ['update:modelValue', 'update:currentPage'] },
          ],
          'vue/no-unused-properties': [
            'error',
            { groups: ['props', 'data', 'computed', 'methods'] },
          ],
          'vue/no-unused-refs': 'error',
          'vue/prefer-use-template-ref': 'error',
        },
      },

      // Nuxt page and layout transitions need a single root element
      {
        files: ['app/pages/**/*.vue', 'app/layouts/**/*.vue'],
        rules: {
          'vue/no-multiple-template-root': ['error', { disallowComments: true }],
        },
      },

      ...configs,
    ),

    // Disable rules handled by Oxlint. Kept outside defineConfigWithVueTs: it lists type-aware
    // rules (as "off"), which would make it switch on the TS project service for every file.
    // The shared base is read directly: eslint-plugin-oxlint drops `categories` from `extends`.
    ...pluginOxlint.buildFromOxlintConfigFile(baseOxlintConfigFile),
    ...pluginOxlint.buildFromOxlintConfigFile(oxlintConfigFile),

    // Turn off formatting rules — oxfmt formats
    skipFormatting,
  ]
}

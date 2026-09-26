// Minimal flat ESLint config for the Preact + Vite frontend.
// Covers react-hooks (exhaustive-deps: warn via recommended-latest) and
// jsx-a11y recommended rules. Type-aware rules are intentionally off so the
// config stays fast and never breaks `pnpm build` or CI (nothing references
// this config from build scripts).
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Core rules that cannot understand TypeScript type positions are off:
      // `tsc --noEmit -p tsconfig.app.json` is the source of truth for them.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
];

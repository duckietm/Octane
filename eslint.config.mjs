// ESLint config of the client: the Rules of Hooks, and nothing else.
//
// Formatting and the general lint baseline are Biome's job (`yarn lint`). ESLint is kept for the one
// check Biome cannot make: react-hooks/rules-of-hooks, so a hook-order violation breaks the build the
// same way a typecheck or test failure would. Wired up as `yarn lint:hooks` (see package.json) and
// called from .github/workflows/ci.yml; the editor's ESLint extension reads this file as well.

import typescriptEslintParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    {
        files: ['**/*.jsx', '**/*.js', '**/*.tsx', '**/*.ts'],
        plugins: {
            'react-hooks': reactHooksPlugin
        },
        languageOptions: {
            parser: typescriptEslintParser,
            ecmaVersion: 'latest',
            parserOptions: {
                sourceType: 'module',
                project: './tsconfig.json',
                tsconfigRootDir: __dirname,
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error'
        }
    }
];

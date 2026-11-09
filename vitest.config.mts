import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Test runner config — kept separate from vite.config.mjs because the
 * dev/build config wires up the renderer SDK via filesystem aliases that
 * point at sibling working trees (`../octane-renderer`, `../renderer`).
 *
 * Tests live next to their subject under `src/` (`foo.ts` + `foo.test.ts`).
 * The renderer SDK is aliased to a hand-written stub at
 * `src/octane-renderer.mock.ts` so jsdom doesn't try to evaluate Pixi +
 * the full message parser/composer registry at import time.
 */
const alias = {
    '@octane/renderer': resolve(__dirname, 'src/octane-renderer.mock.ts'),
    'pixi.js': resolve(__dirname, 'src/pixi.mock.ts'),
    '@': resolve(__dirname, 'src'),
    '@layout': resolve(__dirname, 'src/layout')
};

/**
 * Creating a jsdom window per test file dominated the run (472 windows, over
 * half of the tracked time). Component suites (`.test.tsx`) keep jsdom; plain
 * `.test.ts` suites run in node. A `.test.ts` that needs the DOM opts in with
 * a `@vitest-environment jsdom` pragma.
 */
export default defineConfig({
    test: {
        globals: false,
        setupFiles: [ './src/test-setup.ts' ],
        css: false,
        projects: [
            {
                resolve: { alias },
                test: { name: 'dom', environment: 'jsdom', include: [ 'src/**/*.test.tsx' ] }
            },
            {
                resolve: { alias },
                test: { name: 'node', environment: 'node', include: [ 'src/**/*.test.ts' ] }
            }
        ]
    }
});

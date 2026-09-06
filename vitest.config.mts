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
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: false,
        include: [ 'src/**/*.test.ts', 'src/**/*.test.tsx' ],
        setupFiles: [ './src/test-setup.ts' ],
        css: false
    },
    resolve: {
        alias: {
            '@octane/renderer': resolve(__dirname, 'src/octane-renderer.mock.ts'),
            '@': resolve(__dirname, 'src'),
            '@layout': resolve(__dirname, 'src/layout')
        }
    }
});

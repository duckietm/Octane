/**
 * Vitest stand-in for `pixi.js`. The client reaches PixiJS through the renderer
 * SDK's node_modules in dev and build (see vite.config.mjs), which the jsdom
 * test environment cannot resolve. Code that needs PixiJS loads it on demand
 * (`await import('pixi.js')`) and treats a missing renderer as "unavailable",
 * so this stub only has to make the specifier resolvable.
 */
export const autoDetectRenderer = async (): Promise<never> => {
    throw new Error('PixiJS is not available in the test environment');
};

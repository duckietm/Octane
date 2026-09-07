import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import sirv from 'sirv';
import { isValidJsonMode } from './scripts/json-mode.mjs';

const legacyRendererRoot = resolve(import.meta.dirname, '..', 'renderer');
const currentRendererRoot = resolve(import.meta.dirname, '..', 'Octane-Renderer');
// Checkouts cloned before the repository was renamed still use the lowercase
// folder, which tsconfig.json also points at. Linux is case sensitive, so the
// previous name has to stay in the lookup chain or those checkouts resolve to
// the legacy path and the config throws.
const previousRendererRoot = resolve(import.meta.dirname, '..', 'octane-renderer');
const rendererRoot = [currentRendererRoot, previousRendererRoot, legacyRendererRoot].find(existsSync) ?? legacyRendererRoot;

// Game assets live outside the repo, in a sibling directory next to Octane.
// They are NOT placed under public/ on purpose: with ~177k files a symlink
// under public/ makes chokidar try to install a watcher on each one and the
// dev server takes minutes to start on Windows. Serving them with a
// dedicated sirv middleware (below) bypasses chokidar entirely.
const octaneFilesRoot = resolve(import.meta.dirname, '..', 'Nitro-Files');
const octaneAssetsRoot = resolve(octaneFilesRoot, 'nitro-assets');
const swfRoot = resolve(octaneFilesRoot, 'swf');

const octaneAssetsServer = () => ({
    name: 'nitro-assets-serve',
    configureServer(server)
    {
        if(existsSync(octaneAssetsRoot))
        {
            server.middlewares.use('/nitro-assets', sirv(octaneAssetsRoot, { dev: true, etag: true, maxAge: 0 }));
        }
        else
        {
            server.config.logger.warn(`[nitro-assets-serve] ${ octaneAssetsRoot } not found — /nitro-assets/* requests will 404.`);
        }

        if(existsSync(swfRoot))
        {
            server.middlewares.use('/swf', sirv(swfRoot, { dev: true, etag: true, maxAge: 0 }));
        }
        else
        {
            server.config.logger.warn(`[nitro-assets-serve] ${ swfRoot } not found — /swf/* requests will 404.`);
        }
    },
    configurePreviewServer(server)
    {
        if(existsSync(octaneAssetsRoot))
        {
            server.middlewares.use('/nitro-assets', sirv(octaneAssetsRoot, { dev: false, etag: true }));
        }
        if(existsSync(swfRoot))
        {
            server.middlewares.use('/swf', sirv(swfRoot, { dev: false, etag: true }));
        }
    }
});

if(!existsSync(rendererRoot))
{
    // Fail fast with a useful message instead of waiting for Rolldown to
    // report "Failed to resolve import @octane/renderer" deep
    // inside the bundle pass.
    throw new Error(
        '\n  Octane Renderer SDK not found.\n\n' +
        '  vite.config.mjs expects one of these directories to exist as a sibling of this repo:\n' +
        `    - ${ currentRendererRoot } (preferred)\n` +
        `    - ${ previousRendererRoot } (previous name)\n` +
        `    - ${ legacyRendererRoot } (legacy)\n\n` +
        '  Clone Octane Renderer next to Octane and rerun:\n' +
        '    git clone <renderer-repo> ../octane-renderer\n' +
        '    cd ../octane-renderer && yarn install\n\n' +
        '  (See CLAUDE.md "Commands" section for the full setup walkthrough.)\n'
    );
}

const ReactCompilerConfig = {
    target: '19'
};

const resolveJsonMode = () =>
{
    // OCTANE_* is the current name; NITRO_* stays as a fallback for existing setups
    const envOverride = process.env.OCTANE_JSON_MODE ?? process.env.NITRO_JSON_MODE;
    if(isValidJsonMode(envOverride)) return envOverride;

    // .nitro-build.json is the legacy name kept for existing local setups
    for(const name of ['.octane-build.json', '.nitro-build.json'])
    {
        const configFile = resolve(import.meta.dirname, name);
        if(!existsSync(configFile)) continue;

        try
        {
            const parsed = JSON.parse(readFileSync(configFile, 'utf8'));
            if(isValidJsonMode(parsed?.jsonMode)) return parsed.jsonMode;
        }
        catch {}
    }

    return 'auto';
};

const octaneJsonMode = resolveJsonMode();
const octaneSingleBundle = (process.env.OCTANE_SINGLE_BUNDLE ?? process.env.NITRO_SINGLE_BUNDLE) === '1';
process.stdout.write(`[vite] __OCTANE_JSON_MODE__ = ${ octaneJsonMode }\n`);
process.stdout.write(`[vite] OCTANE_SINGLE_BUNDLE = ${ octaneSingleBundle ? '1' : '0' }\n`);

export default defineConfig({
    base: process.env.VITE_BASE || './',
    plugins: [
        react({
            babel: {
                plugins: [
                    [ 'babel-plugin-react-compiler', ReactCompilerConfig ]
                ]
            }
        }),
        octaneAssetsServer()
    ],
    define: {
        __OCTANE_JSON_MODE__: JSON.stringify(octaneJsonMode)
    },
    server: {
        fs: {
            allow: [
                resolve(import.meta.dirname),
                rendererRoot,
            ]
        },
        proxy: {
            '/api': {
                target: process.env.AUTH_PROXY_TARGET || 'http://localhost:2096',
                changeOrigin: true,
            }
        }
    },
    resolve: {
        tsconfigPaths: true,
        alias: {
            '@': resolve(import.meta.dirname, 'src'),
            '~': resolve(import.meta.dirname, 'node_modules'),
            // Force the umbrella to the source index.ts. Without this,
            // node-module resolution (via the symlink at
            // node_modules/@octane/renderer -> ../octane-renderer)
            // can land on the stale `dist/index.js` when one exists in
            // the renderer working tree — leaving the bundle with
            // pre-snapshot-pattern stubs and producing runtime errors
            // like "TypeError: (intermediate value)() is undefined"
            // when newer code calls getUserDataSnapshot() / .subscribe()
            // / OctaneEventType.SESSION_DATA_UPDATED etc.
            '@octane/renderer': resolve(rendererRoot, 'index.ts'),
            '@octane/api': resolve(rendererRoot, 'packages/api/src/index.ts'),
            '@octane/assets': resolve(rendererRoot, 'packages/assets/src/index.ts'),
            '@octane/avatar': resolve(rendererRoot, 'packages/avatar/src/index.ts'),
            '@octane/camera': resolve(rendererRoot, 'packages/camera/src/index.ts'),
            '@octane/communication': resolve(rendererRoot, 'packages/communication/src/index.ts'),
            '@octane/configuration': resolve(rendererRoot, 'packages/configuration/src/index.ts'),
            '@octane/events': resolve(rendererRoot, 'packages/events/src/index.ts'),
            '@octane/localization': resolve(rendererRoot, 'packages/localization/src/index.ts'),
            '@octane/room': resolve(rendererRoot, 'packages/room/src/index.ts'),
            '@octane/session': resolve(rendererRoot, 'packages/session/src/index.ts'),
            '@octane/sound': resolve(rendererRoot, 'packages/sound/src/index.ts'),
            '@octane/utils/src': resolve(rendererRoot, 'packages/utils/src'),
            '@octane/utils': resolve(rendererRoot, 'packages/utils/src/index.ts'),
            // Keep Pixi's exported registration entry ahead of the broad
            // package-directory alias, which would otherwise swallow this
            // subpath and resolve it to a directory that does not exist.
            'pixi.js/advanced-blend-modes': resolve(rendererRoot, 'node_modules/pixi.js/lib/advanced-blend-modes/init.mjs'),
            'pixi.js': resolve(rendererRoot, 'node_modules/pixi.js'),
            'pixi-filters': resolve(rendererRoot, 'node_modules/pixi-filters'),
            'howler': resolve(rendererRoot, 'node_modules/howler'),
        }
    },
    build: {
        assetsInlineLimit: 102400,
        chunkSizeWarningLimit: 200000,
        manifest: true,
        rollupOptions: {
            checks: {
                pluginTimings: false
            },
            output: octaneSingleBundle ? {
                assetFileNames: 'src/assets/[name]-[hash].[ext]',
                entryFileNames: 'assets/app.js',
                inlineDynamicImports: true
            } : {
                assetFileNames: 'src/assets/[name]-[hash].[ext]',
                // Granular chunking: split the monolithic vendor / octane-renderer
                // bundles into smaller chunks so the browser can fetch them in
                // parallel and CF can cache each independently. Splits chosen
                // by size impact (pixi ~600KB, react ~150KB, framer-motion ~100KB,
                // jodit ~250KB lazy-loaded only by admin news, etc.).
                manualChunks: id =>
                {
                    // Vendor checks first — pixi.js/howler are aliased to
                    // ../octane-renderer/node_modules so they match
                    // `octane-renderer` too. Without this priority, they end
                    // up bundled into octane-renderer instead of getting their
                    // own chunks (pixi alone is ~600KB). Use `/pixi.js/` to
                    // avoid matching path fragments like `assets/pixi.js/`.
                    const norm = id.replace(/\\/g, '/');
                    if(norm.includes('pixi.js') || norm.includes('pixi-filters')) return 'vendor-pixi';
                    if(norm.includes('howler')) return 'vendor-audio';
                    if(norm.includes('@emoji-mart')) return 'vendor-emoji';
                    if(norm.includes('jodit') || norm.includes('@react-page')) return 'vendor-editor';

                    if(id.includes('Octane-Renderer') || id.includes(`${ rendererRoot }`))
                    {
                        // Heaviest renderer packages get their own chunks so
                        // pages that don't touch them (login flow, very early
                        // boot) don't have to pay for them upfront.
                        if(id.includes('/packages/avatar/')) return 'octane-renderer-avatar';
                        if(id.includes('/packages/communication/')) return 'octane-renderer-comm';
                        if(id.includes('/packages/room/')) return 'octane-renderer-room';
                        if(id.includes('/packages/assets/')) return 'octane-renderer-assets';
                        return 'octane-renderer';
                    }

                    if(id.includes('node_modules'))
                    {
                        if(id.includes('@octane/renderer') || id.includes('renderer3')) return 'octane-renderer';
                        if(id.match(/\/react(-dom)?\/|\/scheduler\//) || id.includes('react-error-boundary')) return 'vendor-react';
                        if(id.includes('framer-motion')) return 'vendor-motion';
                        if(id.includes('@tanstack')) return 'vendor-query';
                        if(id.includes('zustand')) return 'vendor-state';
                        if(id.includes('react-icons')) return 'vendor-icons';
                        if(id.includes('strip-json-comments')) return 'vendor-jsonc';
                        return 'vendor';
                    }
                }
            }
        }
    }
});

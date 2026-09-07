import { encodeBytes } from './asset-codec.mjs';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

const dist = 'dist';
const buildVersion = Date.now().toString(36);

const walk = dir =>
{
    const out = [];

    for(const entry of readdirSync(dir))
    {
        const path = join(dir, entry);
        const stat = statSync(path);

        if(stat.isDirectory()) out.push(...walk(path));
        else out.push(path);
    }

    return out;
};

const minifyJson = path =>
{
    try
    {
        writeFileSync(path, JSON.stringify(JSON.parse(readFileSync(path, 'utf8'))));
    }
    catch {}
};

const encryptFile = path =>
{
    const bytes = gzipSync(readFileSync(path), { level: 9 });
    writeFileSync(path + '.dat', encodeBytes(bytes));
};

if(!existsSync(dist)) throw new Error('dist folder not found');

for(const file of walk(dist))
{
    if(file.endsWith('.json')) minifyJson(file);
}

for(const file of walk(dist))
{
    if(file.endsWith('.js') && !file.endsWith('asset-loader.js')) encryptFile(file);
    if(file.endsWith('.css')) encryptFile(file);
}

const viteManifest = join(dist, '.vite', 'manifest.json');

if(existsSync(viteManifest)) copyFileSync(viteManifest, join(dist, 'manifest.json'));

const assetMirrorDir = join(dist, 'src', 'assets');
mkdirSync(assetMirrorDir, { recursive: true });

for(const file of [ 'app.css.dat', 'app.js.dat' ])
{
    const source = join(dist, 'assets', file);
    const target = join(assetMirrorDir, file);

    if(existsSync(source)) copyFileSync(source, target);
}

const publicLoaderAssets = [
    [ 'src/assets/images/loading/octane-logo.png', 'octane-logo.png' ],
    [ 'src/assets/images/loading/loading.gif', 'loading.gif' ],
    [ 'src/assets/images/notifications/octane_v3.png', 'octane_v3.png' ]
];

for(const [ source, file ] of publicLoaderAssets)
{
    const target = join(dist, 'assets', file);
    const mirrorTarget = join(assetMirrorDir, file);

    if(existsSync(source))
    {
        copyFileSync(source, target);
        copyFileSync(source, mirrorTarget);
    }
}

writeFileSync(join(dist, 'index.html'), `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script></head><body><div id="root"></div><script src="configuration/bootstrap.js?v=${ buildVersion }"></script></body></html>`);

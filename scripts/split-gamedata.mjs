#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, basename, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import stripJsonComments from 'strip-json-comments';

const HELP = `
Octane V3 — gamedata splitter

Takes a legacy single-file gamedata JSON (EffectMap, FigureData, FigureMap,
FurnitureData, HabboAvatarActions, ProductData, ExternalTexts, UITexts) and
produces the directory layout consumed by the split-aware loader:

  <output>/
    manifest.jsonc      tier order (defaults to core/custom/seasonal)
    core/
      manifest.jsonc    files list, in load order
      <part1>.jsonc
      <part2>.jsonc
      ...

Custom and seasonal tiers are NOT generated — those are operator-owned and
will be auto-discovered by the loader if their manifest.jsonc exists.

Usage:
  node scripts/split-gamedata.mjs --input <file> --output <dir> [flags]

Required:
  --input <path>         Path to the JSON or JSONC file
  --output <dir>         Target directory (will contain core/, manifest.jsonc)

Optional:
  --type <name>          Force the gamedata type (effectmap, figuredata,
                         figuremap, furnidata, avatar-actions, productdata,
                         external-texts, ui-texts). Default: auto-detect
  --chunk-size <N>       Items per chunk for the bucket-based splits.
                         Defaults: figuremap=500, furnidata=300, productdata=500,
                         external-texts/ui-texts split by prefix instead
  --json (or --legacy)   Emit standard JSON instead of JSONC (no comments)
  --jsonc                Emit JSONC with generated comments (default)
  --force                Overwrite the output directory if it already exists
  --help, -h             Show this help

Examples:
  node scripts/split-gamedata.mjs \\
    --input ~/gamedata/FurnitureData.json \\
    --output ~/nitro-assets/gamedata/furnidata

  node scripts/split-gamedata.mjs \\
    --input ./EffectMap.json --output ./effectmap --chunk-size 50

After splitting, point your renderer-config at the directory (note the
trailing slash):

    "furnidata.url": "https://example.com/nitro-assets/gamedata/furnidata/"
`;

const args = process.argv.slice(2);
const opts = {
    input: null,
    output: null,
    type: null,
    chunkSize: null,
    asJsonc: true,
    force: false,
    help: false
};

for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--input') opts.input = args[++i];
    else if (a === '--output') opts.output = args[++i];
    else if (a === '--type') opts.type = args[++i];
    else if (a === '--chunk-size') opts.chunkSize = parseInt(args[++i], 10);
    else if (a === '--json' || a === '--legacy') opts.asJsonc = false;
    else if (a === '--jsonc') opts.asJsonc = true;
    else if (a === '--force') opts.force = true;
    else if (a.startsWith('--input=')) opts.input = a.slice('--input='.length);
    else if (a.startsWith('--output=')) opts.output = a.slice('--output='.length);
    else if (a.startsWith('--type=')) opts.type = a.slice('--type='.length);
    else if (a.startsWith('--chunk-size=')) opts.chunkSize = parseInt(a.slice('--chunk-size='.length), 10);
    else {
        process.stderr.write(`Unknown flag: ${ a }\n`);
        process.exit(2);
    }
}

if (opts.help) {
    process.stdout.write(HELP);
    process.exit(0);
}

if (!opts.input || !opts.output) {
    process.stderr.write('Missing --input or --output. Use --help for usage.\n');
    process.exit(2);
}

if (!existsSync(opts.input)) {
    process.stderr.write(`Input file not found: ${ opts.input }\n`);
    process.exit(1);
}

const detectType = (data) => {
    if (!data || typeof data !== 'object') return null;
    const keys = new Set(Object.keys(data));
    if (keys.has('roomitemtypes') || keys.has('wallitemtypes')) return 'furnidata';
    if (keys.has('palettes') && keys.has('setTypes')) return 'figuredata';
    if (keys.has('libraries')) return 'figuremap';
    if (keys.has('effects')) return 'effectmap';
    if (keys.has('actions')) return 'avatar-actions';
    if (keys.has('productdata')) return 'productdata';
    // Flat dict heuristic: many top-level scalar keys with dots → texts
    if (keys.size > 30 && Object.values(data).every(v => typeof v === 'string')) {
        const sampleKey = Object.keys(data)[0] || '';
        return sampleKey.includes('.') ? 'external-texts' : 'ui-texts';
    }
    return null;
};

const splitArrayInChunks = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
};

const splitByPrefix = (dict, maxPerBucket = 800) => {
    const buckets = new Map();
    for (const key of Object.keys(dict)) {
        const prefix = key.split('.')[0] || '_other';
        if (!buckets.has(prefix)) buckets.set(prefix, {});
        buckets.get(prefix)[key] = dict[key];
    }
    // Merge small buckets into a shared one to reduce manifest noise
    const out = [];
    const small = {};
    let smallCount = 0;
    for (const [name, content] of buckets) {
        const size = Object.keys(content).length;
        if (size < 50) {
            Object.assign(small, content);
            smallCount += size;
        } else {
            // split further if oversized
            if (size > maxPerBucket) {
                const entries = Object.entries(content);
                const slices = splitArrayInChunks(entries, maxPerBucket);
                slices.forEach((slice, idx) => {
                    const part = {};
                    for (const [k, v] of slice) part[k] = v;
                    out.push([ `${ name }-${ String(idx + 1).padStart(3, '0') }`, part ]);
                });
            } else {
                out.push([ name, content ]);
            }
        }
    }
    if (smallCount > 0) out.push([ '_misc', small ]);
    return out;
};

const sanitizeName = (name) => name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

const ext = () => opts.asJsonc ? 'jsonc' : 'json';

const writePart = (filePath, data, headerComment) => {
    const body = JSON.stringify(data, null, 4);
    const out = opts.asJsonc && headerComment
        ? `// ${ headerComment }\n${ body }\n`
        : `${ body }\n`;
    writeFileSync(filePath, out, 'utf8');
};

const buildSplits = (type, data) => {
    switch (type) {
        case 'effectmap': {
            const effects = data.effects || [];
            const byType = new Map();
            for (const e of effects) {
                const t = sanitizeName(e.type || 'other');
                if (!byType.has(t)) byType.set(t, []);
                byType.get(t).push(e);
            }
            return Array.from(byType, ([ t, items ]) => ({
                name: `effects-${ t }.${ ext() }`,
                comment: `Effects of type "${ t }" (${ items.length } items)`,
                content: { effects: items }
            }));
        }
        case 'figuredata': {
            const parts = [];
            if (data.palettes?.length) {
                parts.push({
                    name: `palettes.${ ext() }`,
                    comment: `Color palettes (${ data.palettes.length })`,
                    content: { palettes: data.palettes }
                });
            }
            for (const st of (data.setTypes || [])) {
                const t = sanitizeName(st.type);
                parts.push({
                    name: `settype-${ t }.${ ext() }`,
                    comment: `setType "${ st.type }" (paletteId=${ st.paletteId })`,
                    content: { setTypes: [ st ] }
                });
            }
            return parts;
        }
        case 'figuremap': {
            const libs = data.libraries || [];
            const size = opts.chunkSize || 500;
            const chunks = splitArrayInChunks(libs, size);
            return chunks.map((chunk, idx) => ({
                name: `libraries-${ String(idx + 1).padStart(3, '0') }.${ ext() }`,
                comment: `libraries ${ idx * size + 1 }..${ idx * size + chunk.length } of ${ libs.length }`,
                content: { libraries: chunk }
            }));
        }
        case 'furnidata': {
            const parts = [];
            const size = opts.chunkSize || 300;
            const floor = data.roomitemtypes?.furnitype || [];
            const wall = data.wallitemtypes?.furnitype || [];
            const floorChunks = splitArrayInChunks(floor, size);
            floorChunks.forEach((chunk, idx) => {
                parts.push({
                    name: `floor-${ String(idx + 1).padStart(3, '0') }.${ ext() }`,
                    comment: `Floor furniture ${ idx * size + 1 }..${ idx * size + chunk.length } of ${ floor.length }`,
                    content: { roomitemtypes: { furnitype: chunk } }
                });
            });
            const wallChunks = splitArrayInChunks(wall, size);
            wallChunks.forEach((chunk, idx) => {
                parts.push({
                    name: `wall-${ String(idx + 1).padStart(3, '0') }.${ ext() }`,
                    comment: `Wall furniture ${ idx * size + 1 }..${ idx * size + chunk.length } of ${ wall.length }`,
                    content: { wallitemtypes: { furnitype: chunk } }
                });
            });
            return parts;
        }
        case 'avatar-actions': {
            const actions = data.actions || [];
            const byState = new Map();
            for (const a of actions) {
                const s = sanitizeName(a.state || 'other');
                if (!byState.has(s)) byState.set(s, []);
                byState.get(s).push(a);
            }
            if (byState.size <= 1) {
                return [ {
                    name: `actions.${ ext() }`,
                    comment: `All avatar actions (${ actions.length })`,
                    content: { actions }
                } ];
            }
            return Array.from(byState, ([ s, items ]) => ({
                name: `actions-${ s }.${ ext() }`,
                comment: `Actions in state "${ s }" (${ items.length })`,
                content: { actions: items }
            }));
        }
        case 'productdata': {
            const products = data.productdata?.product || [];
            const size = opts.chunkSize || 500;
            const chunks = splitArrayInChunks(products, size);
            return chunks.map((chunk, idx) => ({
                name: `products-${ String(idx + 1).padStart(3, '0') }.${ ext() }`,
                comment: `Products ${ idx * size + 1 }..${ idx * size + chunk.length } of ${ products.length }`,
                content: { productdata: { product: chunk } }
            }));
        }
        case 'external-texts':
        case 'ui-texts': {
            const buckets = splitByPrefix(data, opts.chunkSize || 800);
            return buckets.map(([ name, content ]) => ({
                name: `${ sanitizeName(name) }.${ ext() }`,
                comment: `${ name } (${ Object.keys(content).length } keys)`,
                content
            }));
        }
        default:
            throw new Error(`Unknown gamedata type: ${ type }. Use --type to force one.`);
    }
};

const main = () => {
    const raw = readFileSync(opts.input, 'utf8');

    let data;
    try {
        data = JSON.parse(stripJsonComments(raw, { trailingCommas: true }));
    } catch (e) {
        process.stderr.write(`Could not parse ${ opts.input } as JSON or JSONC: ${ e.message }\n`);
        process.exit(1);
    }

    const type = opts.type || detectType(data);
    if (!type) {
        process.stderr.write('Could not auto-detect gamedata type. Pass --type=<name>. See --help.\n');
        process.exit(1);
    }

    const outDir = resolve(opts.output);
    const coreDir = join(outDir, 'core');

    if (existsSync(outDir)) {
        if (!opts.force) {
            process.stderr.write(`Output directory already exists: ${ outDir }. Use --force to overwrite.\n`);
            process.exit(1);
        }
        rmSync(outDir, { recursive: true, force: true });
    }
    mkdirSync(coreDir, { recursive: true });

    const parts = buildSplits(type, data);
    if (!parts.length) {
        process.stderr.write(`No content produced for type ${ type }. Input may be empty.\n`);
        process.exit(1);
    }

    for (const part of parts) {
        writePart(join(coreDir, part.name), part.content, part.comment);
    }

    const coreManifest = {
        files: parts.map(p => p.name)
    };
    const coreManifestBody = opts.asJsonc
        ? `// Auto-generated by split-gamedata.mjs from ${ basename(opts.input) }\n// Type: ${ type } — ${ parts.length } files, ${ parts.reduce((n, p) => n + JSON.stringify(p.content).length, 0).toLocaleString() } chars total\n${ JSON.stringify(coreManifest, null, 4) }\n`
        : `${ JSON.stringify(coreManifest, null, 4) }\n`;
    writeFileSync(join(coreDir, `manifest.${ ext() }`), coreManifestBody, 'utf8');

    const rootManifest = { tiers: [ 'core', 'custom', 'seasonal' ] };
    const rootManifestBody = opts.asJsonc
        ? `// Root manifest — load order of tiers (later overrides earlier by id/classname).\n// Drop a custom/manifest.${ ext() } and/or seasonal/manifest.${ ext() } to add\n// override tiers without touching core/.\n${ JSON.stringify(rootManifest, null, 4) }\n`
        : `${ JSON.stringify(rootManifest, null, 4) }\n`;
    writeFileSync(join(outDir, `manifest.${ ext() }`), rootManifestBody, 'utf8');

    process.stdout.write([
        `[split-gamedata] ${ type } -> ${ outDir }`,
        `  ${ parts.length } file(s) in core/`,
        `  tiers: core (always loaded), custom (optional), seasonal (optional)`,
        `  point renderer-config at: ${ outDir.replace(/\\/g, '/') }/`,
        ''
    ].join('\n'));
};

try {
    main();
} catch (e) {
    process.stderr.write(`[split-gamedata] ${ e.message }\n`);
    process.exit(1);
}

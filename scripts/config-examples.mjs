#!/usr/bin/env node
// configuration-keys.json is the one list of the configuration keys, grouped by category (server, assets, login,
// ..., data/chat-styles); CONFIG_FILES in config-registry.mjs puts the categories into four files, one section each.
// For each key: a one-line comment, the value the client
// falls back to when a hotel leaves it out ("value"), the value the example shows when it differs
// ("example", e.g. an address to fill in at install), and "runtime" when that fallback is registered at boot.
//
// From it this script writes:
//   public/configuration/config.example.jsonc       the base file: which files to load, in order
//   public/configuration/config.example/*.json     server, hotel, features and data: JSONC, a comment above each key
//   src/api/configuration/configurationDefaults.json   the "runtime" fallbacks, registered at boot
// and rewrites configuration-keys.json itself one entry per line.
//
// A hotel copies config.example.jsonc to config.jsonc and the config.example folder to config/.
//
// Usage: yarn config:examples [--check]     --check writes nothing and exits 1 when a file is out of date.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, relative, resolve } from 'path';
import { CONFIG_DIR, CONFIG_FILES, configFilePath, exampleValue, loadRegistry, REGISTRY_PATH as REGISTRY, renderBase, renderFile, ROOT } from './config-registry.mjs';

const EXAMPLE_DIR = resolve(CONFIG_DIR, 'config.example');
const check = process.argv.slice(2).includes('--check');

const registry = loadRegistry();
const categories = Object.keys(registry);

// Every key once, across all files: they load into one store.
const seen = new Set();

for(const category of categories) for(const entry of registry[category])
{
    if(!entry.key) continue;
    if(seen.has(entry.key)) throw new Error(`configuration-keys.json: "${ entry.key }" is listed twice`);

    seen.add(entry.key);
}

const baseFile = () => renderBase(CONFIG_FILES.map(configFilePath));

const defaults = () =>
{
    const out = {};

    for(const category of categories) for(const entry of registry[category]) if(entry.key && entry.runtime) out[entry.key] = entry.value;

    return `${ JSON.stringify(out, null, 4) }\n`;
};

const compactRegistry = () =>
{
    const files = categories.map(category => `    ${ JSON.stringify(category) }: [\n${ registry[category].map(entry => `        ${ JSON.stringify(entry) }`).join(',\n') }\n    ]`);

    return `{\n${ files.join(',\n') }\n}\n`;
};

const outputs = [
    [ resolve(CONFIG_DIR, 'config.example.jsonc'), baseFile() ],
    ...CONFIG_FILES.map(spec => [ resolve(EXAMPLE_DIR, `${ spec.name }.jsonc`), renderFile(registry, spec, exampleValue) ]),
    [ resolve(ROOT, 'src/api/configuration/configurationDefaults.json'), defaults() ],
    [ REGISTRY, compactRegistry() ]
];

// A category file that the registry no longer lists is stale too.
const expected = new Set(outputs.map(([ path ]) => path));
const listed = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? listed(resolve(dir, entry.name)) : [ resolve(dir, entry.name) ])) : []);
const leftovers = listed(EXAMPLE_DIR).filter(path => !expected.has(path));

let stale = 0;

for(const [ path, text ] of outputs)
{
    let current = null;

    try { current = readFileSync(path, 'utf8').replace(/\r\n/g, '\n'); }
    catch { current = null; }

    if(current === text) continue;

    stale++;

    if(check) process.stdout.write(`[config-examples] out of date: ${ relative(ROOT, path) }\n`);
    else
    {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text, 'utf8');
    }
}

for(const path of leftovers)
{
    stale++;

    if(check) process.stdout.write(`[config-examples] not in the registry: ${ relative(ROOT, path) }\n`);
    else rmSync(path);
}

// Folders the removed files leave empty.
const emptyFolders = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory()).flatMap(entry => [ ...emptyFolders(resolve(dir, entry.name)), resolve(dir, entry.name) ]) : []);

if(!check) for(const dir of emptyFolders(EXAMPLE_DIR)) if(!readdirSync(dir).length) rmdirSync(dir);

if(check && stale) process.exitCode = 1;
else if(!check) process.stdout.write(`[config-examples] ${ seen.size } keys in ${ CONFIG_FILES.length } files, ${ stale } file(s) written or removed\n`);

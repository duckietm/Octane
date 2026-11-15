#!/usr/bin/env node
// configuration-keys.json is the one list of the configuration keys: for each its file (renderer or ui), its
// section, a comment, the value the client falls back to when a hotel leaves it out ("value"), and the value
// the example shows when it differs ("example", e.g. an address to fill in at install).
//
// From it this script writes:
//   public/configuration/renderer-config.example and ui-config.example   (strict JSON: legacy mode reads them)
//   src/api/configuration/configurationDefaults.json                      (the "runtime" values, registered at boot)
// and rewrites configuration-keys.json itself one entry per line.
//
// Usage: yarn config:examples [--check]     --check writes nothing and exits 1 when a file is out of date.
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const REGISTRY = resolve(ROOT, 'configuration-keys.json');
const check = process.argv.slice(2).includes('--check');

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));

const indent = (text, by) => text.replace(/\n/g, `\n${ by }`);

const example = (entries) =>
{
    const lines = entries.map(entry =>
    {
        if(entry.section !== undefined) return `    ${ JSON.stringify(`// ---- ${ entry.section } ----`) }: ""`;
        if(entry.comment !== undefined) return `    ${ JSON.stringify(`// ${ entry.comment }`) }: ""`;

        const value = ('example' in entry) ? entry.example : entry.value;

        return `    ${ JSON.stringify(entry.key) }: ${ indent(JSON.stringify(value, null, 4), '    ') }`;
    });

    return `{\n${ lines.join(',\n') }\n}\n`;
};

const defaults = () =>
{
    const out = {};

    for(const name of Object.keys(registry)) for(const entry of registry[name]) if(entry.key && entry.runtime) out[entry.key] = entry.value;

    return `${ JSON.stringify(out, null, 4) }\n`;
};

const compactRegistry = () =>
{
    const files = Object.keys(registry).map(name => `    ${ JSON.stringify(name) }: [\n${ registry[name].map(entry => `        ${ JSON.stringify(entry) }`).join(',\n') }\n    ]`);

    return `{\n${ files.join(',\n') }\n}\n`;
};

const outputs = [
    [ resolve(ROOT, 'public/configuration/renderer-config.example'), example(registry.renderer) ],
    [ resolve(ROOT, 'public/configuration/ui-config.example'), example(registry.ui) ],
    [ resolve(ROOT, 'src/api/configuration/configurationDefaults.json'), defaults() ],
    [ REGISTRY, compactRegistry() ]
];

// Every key once, across both files: the two files load into one store.
const seen = new Set();

for(const name of Object.keys(registry)) for(const entry of registry[name])
{
    if(!entry.key) continue;
    if(seen.has(entry.key)) throw new Error(`configuration-keys.json: "${ entry.key }" is listed twice`);

    seen.add(entry.key);
}

let stale = 0;

for(const [ path, text ] of outputs)
{
    let current = null;

    try { current = readFileSync(path, 'utf8').replace(/\r\n/g, '\n'); }
    catch { current = null; }

    if(current === text) continue;

    stale++;

    if(check) process.stdout.write(`[config-examples] out of date: ${ path.slice(ROOT.length + 1) }\n`);
    else writeFileSync(path, text, 'utf8');
}

if(check && stale) process.exitCode = 1;
else if(!check) process.stdout.write(`[config-examples] ${ seen.size } keys, ${ stale } file(s) written\n`);

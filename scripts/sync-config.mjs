#!/usr/bin/env node
// Compares a hotel's configuration files (config.jsonc and the files it lists) with configuration-keys.json.
//
//   - missing keys: a key whose fallback the client already uses ("runtime") is added to its section with that
//     value, so nothing changes but the file now shows it; any other missing key is only listed (its example value
//     would change what the hotel does: copy it from config.example/ when wanted);
//   - keys no code reads are listed (most are deprecated), never touched.
//
// A hotel still on renderer-config.json + ui-config.json is told to run yarn config:split first.
//
// Usage: yarn config:sync [--check]     --check writes nothing and exits 1 when a key is missing.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { CONFIG_DIR, configFilePath, fileOfCategory, loadRegistry, parseJsonc, sectionHeading } from './config-registry.mjs';

const checkOnly = process.argv.slice(2).includes('--check');
const basePath = resolve(CONFIG_DIR, 'config.jsonc');

if(!existsSync(basePath))
{
    process.stdout.write('[sync-config] no config.jsonc: run "yarn config:split" to move renderer-config.json + ui-config.json into config/ first.\n');
    process.exit(checkOnly ? 1 : 0);
}

const registry = loadRegistry();
const files = parseJsonc(readFileSync(basePath, 'utf8'))['config.files'] ?? [];
const hotel = {};
const fileOf = {};

for(const file of files)
{
    const path = resolve(CONFIG_DIR, file);

    if(!existsSync(path))
    {
        process.stdout.write(`[sync-config] ${ file } is listed in config.jsonc but missing: the client will fail to load the configuration.\n`);
        process.exitCode = 1;
        continue;
    }

    for(const key of Object.keys(parseJsonc(readFileSync(path, 'utf8')))) { hotel[key] = true; fileOf[key] = file; }
}

const known = new Set();
let missingTotal = 0;

for(const category of Object.keys(registry))
{
    const target = configFilePath(fileOfCategory(category));
    const [ head ] = registry[category];
    const missing = registry[category].filter(entry => entry.key && (known.add(entry.key), !hotel[entry.key]));

    if(!missing.length) continue;

    missingTotal += missing.length;

    const added = missing.filter(entry => entry.runtime);
    const listed = missing.filter(entry => !entry.runtime);

    process.stdout.write(`[sync-config] ${ target }, ${ head.title }: ${ missing.length } missing key(s)\n`);
    for(const entry of listed) process.stdout.write(`    ${ entry.key }  (not added: copy it from config.example/${ target.slice('config/'.length) } if wanted)\n`);
    for(const entry of added) process.stdout.write(`    ${ entry.key } = ${ JSON.stringify(entry.value) }${ checkOnly ? '' : '  (added, the value the client already uses)' }\n`);

    if(checkOnly || !added.length) continue;

    const path = resolve(CONFIG_DIR, target);

    if(!existsSync(path) || !files.includes(target))
    {
        process.stdout.write(`    -> ${ target } is not among the files config.jsonc lists: add it there (see config.example.jsonc).\n`);
        continue;
    }

    // Under the section's heading and its purpose line; a file without that heading gets the keys at its top.
    const text = readFileSync(path, 'utf8');
    const heading = text.indexOf(sectionHeading(head.title));
    let at = text.indexOf('{') + 1;

    if(heading >= 0)
    {
        at = text.indexOf('\n', heading) + 1;

        const purpose = text.slice(at).match(/^[ \t]*\/\/.*\r?\n/);

        if(purpose) at += purpose[0].length;
    }

    const lines = added.map(entry => `\n${ entry.comment ? `    // ${ entry.comment }\n` : '' }    ${ JSON.stringify(entry.key) }: ${ JSON.stringify(entry.value) },\n`).join('');
    const updated = `${ text.slice(0, at) }${ lines }${ text.slice(at) }`;

    parseJsonc(updated);
    writeFileSync(path, updated, 'utf8');
}

const unknown = Object.keys(hotel).filter(key => !key.startsWith('//') && !known.has(key));

if(unknown.length) process.stdout.write(`[sync-config] ${ unknown.length } key(s) no code reads (kept): ${ unknown.map(key => `${ key } (${ fileOf[key] })`).join(', ') }\n`);
if(!missingTotal && !unknown.length) process.stdout.write('[sync-config] complete.\n');
if(checkOnly && missingTotal) process.exitCode = 1;

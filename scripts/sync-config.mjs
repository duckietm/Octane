#!/usr/bin/env node
// Compares a hotel's configuration files (config.jsonc and the files it lists) with configuration-keys.json. It only
// reports, it never writes: the hotel's files hold the keys the hotel chose, everything else keeps the client's default.
//
//   - files config.jsonc lists that do not exist (the client would fail to load the configuration);
//   - addresses an install fills in (the keys whose example is a template) that the hotel has not set;
//   - keys set to the very value the client uses anyway: they can go, so a later client can improve that default;
//   - keys no code reads (most are deprecated);
//   - per file, how many keys keep the client's default (config.example/ shows them, with their comments).
//
// A hotel still on renderer-config.json + ui-config.json is told to run yarn config:split first.
//
// Usage: yarn config:sync [--check]     --check exits 1 when a file config.jsonc lists is missing.
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { CONFIG_DIR, configFilePath, fileOfCategory, loadRegistry, parseJsonc } from './config-registry.mjs';

const checkOnly = process.argv.slice(2).includes('--check');
const basePath = resolve(CONFIG_DIR, 'config.jsonc');
const out = (line) => process.stdout.write(`${ line }\n`);

if(!existsSync(basePath))
{
    out('[sync-config] no config.jsonc: run "yarn config:split" to move renderer-config.json + ui-config.json into config/ first.');
    process.exit(checkOnly ? 1 : 0);
}

const registry = loadRegistry();
const files = parseJsonc(readFileSync(basePath, 'utf8'))['config.files'] ?? [];
const hotel = {};
const fileOf = {};
let failing = 0;

for(const file of files)
{
    const path = resolve(CONFIG_DIR, file);

    if(!existsSync(path))
    {
        out(`[sync-config] ${ file } is listed in config.jsonc but missing: the client will fail to load the configuration.`);
        failing++;
        continue;
    }

    const values = parseJsonc(readFileSync(path, 'utf8'));

    for(const key of Object.keys(values)) { hotel[key] = values[key]; fileOf[key] = file; }
}

const known = new Set();
const needsValue = [];
const sameAsDefault = [];
const atDefault = {};

for(const category of Object.keys(registry))
{
    const target = configFilePath(fileOfCategory(category));

    for(const entry of registry[category])
    {
        if(!entry.key) continue;

        known.add(entry.key);

        const set = Object.prototype.hasOwnProperty.call(hotel, entry.key);

        if(!set && ('example' in entry)) needsValue.push(`${ entry.key } (${ target })`);
        else if(!set) atDefault[target] = (atDefault[target] ?? 0) + 1;
        else if(entry.runtime && JSON.stringify(hotel[entry.key]) === JSON.stringify(entry.value)) sameAsDefault.push(`${ entry.key } (${ fileOf[entry.key] })`);
    }
}

const unknown = Object.keys(hotel).filter(key => key !== 'config.files' && !key.startsWith('//') && !known.has(key));

if(needsValue.length) out(`[sync-config] ${ needsValue.length } install address(es) your files do not set (copy them from config.example/ if the hotel uses them): ${ needsValue.join(', ') }`);
if(sameAsDefault.length) out(`[sync-config] ${ sameAsDefault.length } key(s) set to the value the client uses anyway (they can go): ${ sameAsDefault.join(', ') }`);
if(unknown.length) out(`[sync-config] ${ unknown.length } key(s) no code reads (most are deprecated): ${ unknown.map(key => `${ key } (${ fileOf[key] })`).join(', ') }`);

for(const [ target, count ] of Object.entries(atDefault)) out(`[sync-config] ${ target }: ${ count } key(s) keep the client's own value.`);

if(!failing && !needsValue.length && !sameAsDefault.length && !unknown.length) out('[sync-config] complete.');
if(checkOnly && failing) process.exitCode = 1;

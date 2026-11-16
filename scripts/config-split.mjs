#!/usr/bin/env node
// Moves a hotel's old renderer-config.json + ui-config.json into config.jsonc + config/ (server, hotel, features, data).
//
//   - each key the hotel set goes to its section with the hotel's value and the example's comment;
//   - a key the hotel did not set is left out: the client keeps its own default, and a later client may improve it.
//     config.example/ shows every key with its comment, to copy the ones the hotel wants to change;
//   - an old name the client still reads moves to the key that replaced it;
//   - keys configuration-keys.json does not know go to the last section of config/hotel.jsonc (most are deprecated:
//     check and delete them);
//   - the old files are left where they are; with config.jsonc present the client no longer reads them.
//
// Usage: yarn config:split [--dry]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { pathToFileURL } from 'url';
import { CONFIG_DIR, CONFIG_FILES, configFilePath, loadRegistry, parseJsonc, renameOldKeys, renderBase, renderFile } from './config-registry.mjs';

const OLD_FILES = [ 'renderer-config.json', 'ui-config.json' ];

// The file whose last section holds the keys no code reads.
const UNKNOWN_FILE = 'hotel';

export const splitConfiguration = ({ configDir = CONFIG_DIR, dry = false, log = (line) => process.stdout.write(`${ line }\n`) } = {}) =>
{
    if(existsSync(resolve(configDir, 'config.jsonc')))
    {
        log('[config-split] config.jsonc already exists: nothing to split.');

        return { written: [], skipped: true };
    }

    const present = OLD_FILES.filter(file => existsSync(resolve(configDir, file)));

    if(!present.length)
    {
        log('[config-split] no renderer-config.json or ui-config.json to split.');

        return { written: [], skipped: true };
    }

    // The old files load in this order, ui-config.json over renderer-config.json.
    const hotel = {};

    for(const file of present) Object.assign(hotel, parseJsonc(readFileSync(resolve(configDir, file), 'utf8')));

    const registry = loadRegistry();
    // An old name moves to the key that replaced it.
    const renamed = renameOldKeys(registry, hotel);
    const known = new Set();
    const notSet = [];
    const hotelValue = entry =>
    {
        known.add(entry.key);

        if(Object.prototype.hasOwnProperty.call(hotel, entry.key)) return hotel[entry.key];

        notSet.push(entry.key);

        return undefined;
    };

    // First pass fills `known`, so the keys no code reads can then join the file they are reported in.
    for(const spec of CONFIG_FILES) renderFile(registry, spec, hotelValue);
    notSet.length = 0;

    const unknown = Object.keys(hotel).filter(key => !key.startsWith('//') && !known.has(key));
    const unknownSection = {
        title: 'Keys this client does not read',
        about: 'Moved from the old files by yarn config:split. No code reads them: most are deprecated. Check them and delete them.',
        entries: unknown.map(key => ({ key, value: hotel[key] }))
    };
    const outputs = CONFIG_FILES.map(spec => [ configFilePath(spec), renderFile(registry, spec, hotelValue, spec.name === UNKNOWN_FILE ? [ unknownSection ] : []) ]);

    outputs.unshift([ 'config.jsonc', renderBase(CONFIG_FILES.map(configFilePath)) ]);

    for(const [ file, text ] of outputs)
    {
        parseJsonc(text);

        if(dry) continue;

        mkdirSync(dirname(resolve(configDir, file)), { recursive: true });
        writeFileSync(resolve(configDir, file), text, 'utf8');
    }

    log(`[config-split] ${ dry ? 'would write' : 'wrote' } config.jsonc and ${ outputs.length - 1 } file(s) under config/ from ${ present.join(' + ') }.`);
    if(renamed.length) log(`[config-split] ${ renamed.length } old name(s) moved to their new key: ${ renamed.join(', ') }`);
    if(unknown.length) log(`[config-split] ${ unknown.length } key(s) no code reads went to the last section of config/hotel.jsonc: ${ unknown.join(', ') }`);
    if(notSet.length) log(`[config-split] ${ notSet.length } key(s) your files did not set are left out and keep the client's default; config.example/ shows them all.`);
    log('[config-split] the old files were not touched; with config.jsonc present the client reads config/ instead.');

    return { written: outputs.map(([ file ]) => file), unknown, notSet, skipped: false };
};

if(import.meta.url === pathToFileURL(process.argv[1] ?? '').href) splitConfiguration({ dry: process.argv.slice(2).includes('--dry') });

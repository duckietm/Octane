#!/usr/bin/env node
// Adds the keys the shipped examples have and the hotel's own config files lack, so the client stops
// logging "Missing configuration key". Existing values, comments and order are left as they are; the new
// keys go at the top of the file with the example's value. `--check` only lists them.
//
// The two files load into one store (renderer-config.json first, ui-config.json over it), so a key the hotel
// keeps in the other file counts as present: adding the example's value to ui-config.json would override
// the hotel's own choice. Keys of the hotel's files that no example knows are listed too (often an old or
// misspelt name), and never touched.
//
// Usage: yarn config:sync [--check]
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import stripJsonComments from 'strip-json-comments';
import { fileURLToPath } from 'url';

const CONFIG_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'configuration');
const checkOnly = process.argv.slice(2).includes('--check');

const PAIRS = [
    { target: 'renderer-config.json', examples: [ 'renderer-config.example' ] },
    { target: 'ui-config.json', examples: [ 'ui-config.example' ] }
];

const parseText = (text) => JSON.parse(stripJsonComments(text, { trailingCommas: true }));
const parse = (file) => parseText(readFileSync(resolve(CONFIG_DIR, file), 'utf8'));

let missingTotal = 0;

// "// ---- Section ----" keys only group a file for reading; they are not settings.
const settingKeys = (file) => (existsSync(resolve(CONFIG_DIR, file)) ? Object.keys(parse(file)).filter(key => !key.startsWith('//')) : []);
const hotelKeys = new Set(PAIRS.flatMap(({ target }) => settingKeys(target)));
const exampleKeys = new Set(PAIRS.flatMap(({ examples }) => examples.flatMap(settingKeys)));

for(const { target, examples } of PAIRS)
{
    const example = examples.find(file => existsSync(resolve(CONFIG_DIR, file)));
    const targetPath = resolve(CONFIG_DIR, target);

    if(!example) continue;

    if(!existsSync(targetPath))
    {
        process.stdout.write(`[sync-config] ${ target } does not exist: copy ${ example } to ${ target } first.\n`);
        continue;
    }

    const own = parse(target);
    const missing = Object.entries(parse(example)).filter(([ key ]) => !key.startsWith('//') && !hotelKeys.has(key));
    const unknown = Object.keys(own).filter(key => !key.startsWith('//') && !exampleKeys.has(key));

    if(unknown.length) process.stdout.write(`[sync-config] ${ target }: ${ unknown.length } key(s) no example knows (kept): ${ unknown.join(', ') }\n`);

    missingTotal += missing.length;

    if(!missing.length)
    {
        process.stdout.write(`[sync-config] ${ target }: complete.\n`);
        continue;
    }

    process.stdout.write(`[sync-config] ${ target }: ${ missing.length } missing key(s)\n`);

    for(const [ key, value ] of missing) process.stdout.write(`    ${ key } = ${ JSON.stringify(value) }\n`);

    if(checkOnly) continue;

    const text = readFileSync(targetPath, 'utf8');
    const open = text.indexOf('{');
    const lines = missing.map(([ key, value ]) => `    ${ JSON.stringify(key) }: ${ JSON.stringify(value) },`).join('\n');
    // An empty object gets no trailing comma, so a strict JSON file stays strict JSON.
    const updated = Object.keys(own).length
        ? `${ text.slice(0, open + 1) }\n${ lines }${ text.slice(open + 1) }`
        : `{\n${ lines.replace(/,$/, '') }\n}\n`;

    parseText(updated);
    writeFileSync(targetPath, updated, 'utf8');
    process.stdout.write(`    -> added to ${ target }\n`);
}

if(checkOnly && missingTotal) process.exitCode = 1;

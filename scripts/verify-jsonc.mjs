#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import stripJsonComments from 'strip-json-comments';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const CONFIG_ROOT = join(PROJECT_ROOT, 'public', 'configuration');
const ACTIVE_TEXT_ROOTS = [
    join(PROJECT_ROOT, 'public', 'configuration'),
    join(PROJECT_ROOT, 'src'),
    join(PROJECT_ROOT, 'scripts')
];
const ACTIVE_TEXT_FILES = [
    join(PROJECT_ROOT, 'install.mjs'),
    join(PROJECT_ROOT, 'vite.config.mjs'),
    join(PROJECT_ROOT, 'package.json')
];

const walkFiles = root =>
{
    const files = [];

    for(const entry of readdirSync(root))
    {
        const path = join(root, entry);

        if(statSync(path).isDirectory()) files.push(...walkFiles(path));
        else files.push(path);
    }

    return files;
};

const parseCandidates = walkFiles(CONFIG_ROOT).filter(path =>
{
    const name = path.toLowerCase();
    return [ '.json', '.jsonc', '.example' ].includes(extname(name)) || name.endsWith('.jsonc.example');
});

const failures = [];

for(const path of parseCandidates)
{
    try
    {
        const source = readFileSync(path, 'utf8');
        JSON.parse(stripJsonComments(source, { trailingCommas: true }));
    }
    catch(error)
    {
        failures.push(`${ relative(PROJECT_ROOT, path) }: ${ error.message }`);
    }
}

const activeFiles = [
    ...ACTIVE_TEXT_ROOTS.flatMap(walkFiles),
    ...ACTIVE_TEXT_FILES
];

for(const path of activeFiles)
{
    if(path.includes('node_modules')) continue;
    if(path.endsWith(`${ join('scripts', 'verify-jsonc.mjs') }`)) continue;
    if(/\.test\.[cm]?[jt]sx?$/i.test(path)) continue;

    const source = readFileSync(path, 'utf8');

    const removedFormat = [ 'json', '5' ].join('');

    if(new RegExp(`${ removedFormat }|\\.${ removedFormat }|application\\/${ removedFormat }|x-${ removedFormat }`, 'i').test(source))
    {
        failures.push(`${ relative(PROJECT_ROOT, path) }: contains a reference to the removed format`);
    }
}

if(failures.length)
{
    process.stderr.write(`${ failures.join('\n') }\n`);
    process.exit(1);
}

process.stdout.write(`Validated ${ parseCandidates.length } JSON/JSONC configuration files with no references to the removed format.\n`);

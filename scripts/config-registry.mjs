// Shared by config-examples.mjs, config-split.mjs and sync-config.mjs: read configuration-keys.json and write the
// configuration files from it, so every tool lays a file out the same way.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

export const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
export const REGISTRY_PATH = resolve(ROOT, 'configuration-keys.json');
export const CONFIG_DIR = resolve(ROOT, 'public/configuration');

/**
 * The files a hotel edits, under config/, and the registry categories each one holds, in order. Each category is a
 * section of its file, under its own heading.
 */
export const CONFIG_FILES = [
    { name: 'server', about: 'Server, assets and login: the addresses set at install, the login and loading screens, logging.', categories: [ 'server', 'assets', 'login', 'loading', 'logging' ] },
    { name: 'hotel', about: 'The hotel: avatars, rooms, catalog, chat, friends and quests.', categories: [ 'avatar', 'room', 'catalog', 'chat', 'social', 'quests' ] },
    { name: 'features', about: 'Features switched on and off, wired, radio, camera and the staff tools.', categories: [ 'features', 'wired', 'audio', 'camera', 'staff' ] },
    { name: 'data', about: 'The long tables: chat styles, camera effects, notification styles, room models, default figure, palettes. Rarely edited.', categories: [ 'data/chat-styles', 'data/camera-effects', 'data/notifications', 'data/room-models', 'data/default-figuredata', 'data/recolorable-palettes' ] }
];

/** config/<name>.jsonc, the path config.jsonc lists. */
export const configFilePath = (spec) => `config/${ spec.name }.jsonc`;

/** The file spec a registry category belongs to. */
export const fileOfCategory = (category) => CONFIG_FILES.find(spec => spec.categories.includes(category));

export const loadRegistry = () =>
{
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
    const placed = CONFIG_FILES.flatMap(spec => spec.categories);
    const unplaced = Object.keys(registry).filter(category => !placed.includes(category));
    const missing = placed.filter(category => !registry[category]);

    if(unplaced.length) throw new Error(`configuration-keys.json: no file in CONFIG_FILES holds ${ unplaced.join(', ') }`);
    if(missing.length) throw new Error(`CONFIG_FILES names categories configuration-keys.json lacks: ${ missing.join(', ') }`);

    return registry;
};

/** JSONC as these files use it: whole-line // comments and trailing commas. */
export const parseJsonc = (text) => JSON.parse(text.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));

const indent = (text, by) => text.replace(/\n/g, `\n${ by }`);

/** The heading line a section starts with. */
const sectionHeading = (title) => `    // ==== ${ title } ====`;

/**
 * One configuration file: a line on what it holds, then one section per category (heading, purpose, then each key
 * with its comment). `valueOf(entry)` picks the value written; undefined leaves the key out. `extra` sections
 * ({ title, about, entries: [ { key, value, comment? } ] }) go at the end.
 */
export const renderFile = (registry, spec, valueOf, extra = []) =>
{
    const sections = [
        ...spec.categories.map(category =>
        {
            const [ head, ...entries ] = registry[category];

            return { title: head.title, about: head.about, entries: entries.filter(entry => valueOf(entry) !== undefined).map(entry => ({ ...entry, value: valueOf(entry) })) };
        }),
        ...extra
    ].filter(section => section.entries.length);

    const lines = [ '{', `    // ${ spec.about }` ];
    const ends = [];

    for(const section of sections)
    {
        lines.push('', '', sectionHeading(section.title));
        if(section.about) lines.push(`    // ${ section.about }`);

        for(const entry of section.entries)
        {
            lines.push('');
            if(entry.comment) lines.push(`    // ${ entry.comment }`);
            lines.push(`    ${ JSON.stringify(entry.key) }: ${ indent(JSON.stringify(entry.value, null, 4), '    ') }`);
            ends.push(lines.length - 1);
        }
    }

    ends.slice(0, -1).forEach(index => (lines[index] += ','));
    lines.push('}', '');

    return lines.join('\n');
};

/** The base file: the configuration files to load, in order. */
export const renderBase = (files) => [
    '{',
    '    // The configuration files the client loads, in this order. A key set in a later file wins over the same key in',
    '    // an earlier one. Copy this file to config.jsonc and the config.example folder to config/, then edit the copies.',
    '    "config.files": [',
    files.map(file => `        ${ JSON.stringify(file) }`).join(',\n'),
    '    ]',
    '}',
    ''
].join('\n');

/** The value an example shows: the install template when there is one, else the fallback. */
export const exampleValue = (entry) => (('example' in entry) ? entry.example : entry.value);

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONFIG_DIR = join(process.cwd(), 'public', 'configuration');

// The example files are JSONC: whole-line // comments, read the way the client reads them.
const parseJsonc = (text: string): Record<string, unknown> => JSON.parse(text.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));

/** Every file of config.example/, as [path relative to config.example/, keys]. */
const exampleFiles = (dir = join(CONFIG_DIR, 'config.example'), prefix = ''): [string, Record<string, unknown>][] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry): [string, Record<string, unknown>][] =>
        entry.isDirectory()
            ? exampleFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
            : [[`${prefix}${entry.name}`, parseJsonc(readFileSync(join(dir, entry.name), 'utf8'))]]
    );

// Set by bootstrap.ts from the page address before the configuration files load: not a hotel setting.
const SET_AT_BOOT = new Set(['config.urls', 'sso.ticket', 'forward.type', 'forward.id', 'friend.id']);

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) return sourceFiles(path);

        return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|mock)\./.test(entry.name) ? [path] : [];
    });

describe('configuration examples', () => {
    const files = exampleFiles();
    const base = parseJsonc(readFileSync(join(CONFIG_DIR, 'config.example.jsonc'), 'utf8'));

    it('the base file lists exactly the example files, and no key sits in two of them', () => {
        expect([...(base['config.files'] as string[])].sort()).toEqual(files.map(([file]) => `config/${file}`).sort());

        const owner = new Map<string, string>();
        const twice: string[] = [];

        for (const [file, keys] of files) {
            for (const key of Object.keys(keys)) {
                if (owner.has(key)) twice.push(`${key}: ${owner.get(key)} and ${file}`);
                owner.set(key, file);
            }
        }

        expect(twice).toEqual([]);
    });

    it('carry a comment above every key', () => {
        const uncommented: string[] = [];

        for (const [file] of files) {
            const lines = readFileSync(join(CONFIG_DIR, 'config.example', file), 'utf8').split(/\r?\n/);

            lines.forEach((line, index) => {
                if (/^ {4}"[^"]+":/.test(line) && !/^\s*\/\//.test(lines[index - 1] ?? '')) uncommented.push(`${file}: ${line.trim().split(':')[0]}`);
            });
        }

        expect(uncommented).toEqual([]);
    });

    it('document every key the client reads by name', () => {
        const documented = new Set(files.flatMap(([, keys]) => Object.keys(keys)));
        const read = /\b(?:GetConfigurationValue|GetConfigurationRecord|GetConfiguration\(\)\.getValue)\s*(?:<[^>]*>)?\(\s*['"]([A-Za-z0-9_.-]+)['"]/g;
        const undocumented = new Set<string>();

        for (const file of sourceFiles(join(process.cwd(), 'src'))) {
            for (const match of readFileSync(file, 'utf8').matchAll(read)) {
                if (!documented.has(match[1]) && !SET_AT_BOOT.has(match[1])) undocumented.add(`${match[1]} (${file.slice(process.cwd().length + 1)})`);
            }
        }

        expect([...undocumented]).toEqual([]);
    });
});

// configuration-keys.json holds one value per key; a fallback written at a call must not tell another story.
const literal = (text: string): { ok: boolean; value?: unknown } => {
    const t = text.trim();

    if (/^(true|false|null)$/.test(t) || /^-?\d+(\.\d+)?$/.test(t)) return { ok: true, value: JSON.parse(t) };
    if (/^'(?:[^'\\]|\\.)*'$/.test(t)) return { ok: true, value: t.slice(1, -1) };
    if (/^"(?:[^"\\]|\\.)*"$/.test(t)) return { ok: true, value: JSON.parse(t) };
    if (/^\[\s*\]$/.test(t)) return { ok: true, value: [] };
    if (/^\{\s*\}$/.test(t)) return { ok: true, value: {} };

    return { ok: false };
};

describe('configuration-keys.json', () => {
    type Entry = { key?: string; value?: unknown; runtime?: boolean };
    const registry: Record<string, Entry[]> = JSON.parse(readFileSync(join(process.cwd(), 'configuration-keys.json'), 'utf8'));
    const entries = Object.values(registry).flat().filter((entry) => entry.key);
    const documented = new Map(entries.map((entry) => [entry.key, entry.value]));
    const runtime = new Set(entries.filter((entry) => entry.runtime).map((entry) => entry.key));

    it('is what the examples and the boot defaults were generated from (yarn config:examples)', () => {
        expect(() => execFileSync(process.execPath, [join(process.cwd(), 'scripts', 'config-examples.mjs'), '--check'], { encoding: 'utf8' })).not.toThrow();
    });

    it('holds the same fallback the client writes at each call', () => {
        const call = /\b(?:GetConfigurationValue|GetOptionalConfigurationValue|GetConfiguration\(\)\.getValue)\s*(?:<[^>]*>)?\(\s*['"]([A-Za-z0-9_.-]+)['"]\s*,\s*((?:'[^']*'|"[^"]*"|\[[^\]]*\]|[^,()])+?)\s*\)/g;
        const disagreeing: string[] = [];

        for (const file of sourceFiles(join(process.cwd(), 'src'))) {
            for (const match of readFileSync(file, 'utf8').matchAll(call)) {
                const parsed = literal(match[2]);

                if (!parsed.ok || !documented.has(match[1])) continue;
                if (JSON.stringify(parsed.value) !== JSON.stringify(documented.get(match[1]))) {
                    disagreeing.push(`${match[1]}: ${match[2].trim()} vs ${JSON.stringify(documented.get(match[1]))} (${file.slice(process.cwd().length + 1)})`);
                }
            }
        }

        expect(disagreeing).toEqual([]);
    });

    // A read with no fallback gets undefined when the hotel leaves the key out, unless the value is registered at boot:
    // the registry must not promise a value the client never applies.
    it('does not promise a value the client never applies', () => {
        const bare = /\b(?:GetConfigurationValue|GetConfiguration\(\)\.getValue)\s*(?:<[^>]*>)?\(\s*['"]([A-Za-z0-9_.-]+)['"]\s*\)/g;
        const empty = (value: unknown) => value === '' || value === null || value === false || (Array.isArray(value) && !value.length);
        const promised: string[] = [];

        for (const file of sourceFiles(join(process.cwd(), 'src'))) {
            for (const match of readFileSync(file, 'utf8').matchAll(bare)) {
                const key = match[1];

                if (!documented.has(key) || runtime.has(key) || empty(documented.get(key))) continue;

                promised.push(`${key}: ${JSON.stringify(documented.get(key))} (${file.slice(process.cwd().length + 1)})`);
            }
        }

        expect(promised).toEqual([]);
    });
});

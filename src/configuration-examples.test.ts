import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONFIG_DIR = join(process.cwd(), 'public', 'configuration');

// Both examples must stay strict JSON: a hotel built in the legacy JSON mode reads them without comments,
// which is why their sections are "// ---- Section ----" keys and not real comments.
const readExample = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(CONFIG_DIR, name), 'utf8'));

// Set by bootstrap.ts from the page address before the configuration files load: not a hotel setting.
const SET_AT_BOOT = new Set(['config.urls', 'sso.ticket', 'forward.type', 'forward.id', 'friend.id']);

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) return sourceFiles(path);

        return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|mock)\./.test(entry.name) ? [path] : [];
    });

describe('configuration examples', () => {
    const ui = readExample('ui-config.example');
    const renderer = readExample('renderer-config.example');

    it('are strict JSON and keep no key in both files', () => {
        const shared = Object.keys(ui).filter((key) => !key.startsWith('//') && key in renderer);

        expect(shared).toEqual([]);
    });

    it('document every key the client reads by name', () => {
        const documented = new Set([...Object.keys(ui), ...Object.keys(renderer)]);
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
    const runtime = new Map(Object.values(registry).flat().filter((entry) => entry.key && entry.runtime).map((entry) => [entry.key, entry.value]));

    it('is what the examples and the boot defaults were generated from (yarn config:examples)', () => {
        expect(() => execFileSync(process.execPath, [join(process.cwd(), 'scripts', 'config-examples.mjs'), '--check'], { encoding: 'utf8' })).not.toThrow();
    });

    it('holds the same fallback the client writes at each call', () => {
        const call = /\b(?:GetConfigurationValue|GetOptionalConfigurationValue|GetConfiguration\(\)\.getValue)\s*(?:<[^>]*>)?\(\s*['"]([A-Za-z0-9_.-]+)['"]\s*,\s*((?:'[^']*'|"[^"]*"|\[[^\]]*\]|[^,()])+?)\s*\)/g;
        const disagreeing: string[] = [];

        for (const file of sourceFiles(join(process.cwd(), 'src'))) {
            for (const match of readFileSync(file, 'utf8').matchAll(call)) {
                const parsed = literal(match[2]);

                if (!parsed.ok || !runtime.has(match[1])) continue;
                if (JSON.stringify(parsed.value) !== JSON.stringify(runtime.get(match[1]))) {
                    disagreeing.push(`${match[1]}: ${match[2].trim()} vs ${JSON.stringify(runtime.get(match[1]))} (${file.slice(process.cwd().length + 1)})`);
                }
            }
        }

        expect(disagreeing).toEqual([]);
    });
});

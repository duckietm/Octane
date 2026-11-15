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

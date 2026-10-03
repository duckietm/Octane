import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..', '..', '..');
const EN_PATH = join(ROOT, 'public', 'configuration', 'housekeeping-texts-en.example');
const IT_PATH = join(ROOT, 'public', 'configuration', 'housekeeping-texts-it.example');

const loadDict = (path: string): Record<string, string> => {
    const raw = readFileSync(path, 'utf8');

    return JSON.parse(raw);
};

// Walk every .ts/.tsx file under src/ and extract every quoted
// `housekeeping.<...>` literal. Doesn't catch fully dynamic keys
// (e.g. `housekeeping.validation.${ k }`), so we hand-extend the
// expected set with the dynamic prefixes covered in code.
const collectReferencedKeys = (): Set<string> => {
    const sources: string[] = [];

    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            if (entry.startsWith('.') || entry === 'node_modules') continue;

            const full = join(dir, entry);
            const stat = statSync(full);

            if (stat.isDirectory()) walk(full);
            else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) sources.push(full);
        }
    };

    walk(join(ROOT, 'src'));

    const keys = new Set<string>();

    for (const source of sources) {
        const content = readFileSync(source, 'utf8');
        const matches = content.match(/['"`]housekeeping\.[a-z0-9._]+['"`]/g) || [];

        for (const m of matches) {
            const cleaned = m.slice(1, -1);

            // Skip config keys (they live in renderer config, not in
            // the localization dict).
            const CONFIG_KEYS = new Set(['housekeeping.enabled', 'housekeeping.telemetry.enabled', 'housekeeping.audit.poll_interval_ms', 'housekeeping.sanction_templates', 'housekeeping.ticket_replies', 'housekeeping.escalation', 'housekeeping.denied']);

            if (CONFIG_KEYS.has(cleaned)) continue;

            keys.add(cleaned);
        }
    }

    return keys;
};

describe('housekeeping i18n dictionaries', () => {
    it('EN parses as valid JSON', () => {
        expect(() => loadDict(EN_PATH)).not.toThrow();
    });

    it('IT parses as valid JSON', () => {
        expect(() => loadDict(IT_PATH)).not.toThrow();
    });

    it('EN and IT share the exact same key set (no missing translations on either side)', () => {
        const en = loadDict(EN_PATH);
        const it = loadDict(IT_PATH);
        const enKeys = new Set(Object.keys(en));
        const itKeys = new Set(Object.keys(it));

        const missingInIt = [...enKeys].filter((k) => !itKeys.has(k));
        const missingInEn = [...itKeys].filter((k) => !enKeys.has(k));

        expect(missingInIt).toEqual([]);
        expect(missingInEn).toEqual([]);
    });

    it('every value is a non-empty string in both dicts', () => {
        for (const path of [EN_PATH, IT_PATH]) {
            const dict = loadDict(path);

            for (const [key, value] of Object.entries(dict)) {
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
                expect(key.startsWith('housekeeping.')).toBe(true);
            }
        }
    });

    it('EN covers every static `housekeeping.*` key referenced in source code', () => {
        const en = loadDict(EN_PATH);
        const enKeys = new Set(Object.keys(en));
        const referenced = collectReferencedKeys();

        const uncovered = [...referenced].filter((key) => !enKeys.has(key));

        expect(uncovered).toEqual([]);
    });
});

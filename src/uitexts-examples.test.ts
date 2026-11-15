import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LANGUAGES = ['en', 'it', 'de', 'es', 'fr', 'nl', 'tr', 'ar'];

const read = (lang: string): [string, string][] => {
    const source = readFileSync(join(process.cwd(), `public/configuration/UITexts_${lang}.jsonc.example`), 'utf8');
    const parsed = JSON.parse(source.replace(/^\s*\/\/.*$/gm, '')) as Record<string, string>;

    return Object.entries(parsed);
};

/** The placeholders a text carries: %name%, $(name), {0}, a literal \n and HTML tags. */
const placeholders = (text: string) =>
    (text.match(/%[a-zA-Z_][\w.]*%|\$\([\w.]+\)|\{\d+\}|\\n|<\/?[a-zA-Z][^>]*>/g) ?? [])
        .map((token) => token.replace(/<a [^>]*>/, '<a>'))
        .sort()
        .join(' ');

// Every UITexts example holds the same keys in the same order (by area, alphabetical inside), so the
// languages can be compared line by line, and a translation keeps the placeholders of the English text.
describe('UITexts example files', () => {
    const english = read('en');

    it.each(LANGUAGES.slice(1))('%s has the keys of the English file, in its order', (lang) => {
        expect(read(lang).map(([key]) => key)).toEqual(english.map(([key]) => key));
    });

    it.each(LANGUAGES.slice(1))('%s keeps the placeholders of every English text', (lang) => {
        const texts = new Map(read(lang));
        const drifted = english.filter(([key, text]) => placeholders(texts.get(key) ?? '') !== placeholders(text)).map(([key]) => key);

        expect(drifted).toEqual([]);
    });

    it('lists the English keys grouped by area and alphabetical inside each area', () => {
        const area = (key: string) => {
            const parts = key.split('.');

            if (parts.length === 1) return '~other';

            return parts[0] === 'octane' && parts.length > 2 ? `octane.${parts[1]}` : parts[0];
        };
        const keys = english.map(([key]) => key);
        const sorted = [...keys].sort((a, b) => (area(a) === area(b) ? (a < b ? -1 : 1) : area(a) < area(b) ? -1 : 1));

        expect(keys).toEqual(sorted);
    });
});

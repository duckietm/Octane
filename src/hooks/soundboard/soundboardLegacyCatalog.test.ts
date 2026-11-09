import { describe, expect, it } from 'vitest';
import { parseJsonDocument } from '../../json/JsonDocumentParser';
import { normalizeLegacySoundboardCatalog } from './soundboardLegacyCatalog';

describe('legacy Soundboard catalog compatibility', () => {
    it('accepts strict JSON catalogs', () => {
        const value = parseJsonDocument<unknown>('{"sounds":[{"id":1,"name":"Click","url":"sounds/click.ogg"}]}', 'legacy');

        expect(normalizeLegacySoundboardCatalog(value)).toEqual([{ id: 1, name: 'Click', url: 'sounds/click.ogg' }]);
    });

    it('accepts JSONC comments and trailing commas', () => {
        const value = parseJsonDocument<unknown>(
            `{
            // Local-only fallback
            "sounds": [{ "id": 2, "name": "Bong", "url": "sounds/bong.ogg" },],
        }`,
            'jsonc'
        );

        expect(normalizeLegacySoundboardCatalog(value)).toEqual([{ id: 2, name: 'Bong', url: 'sounds/bong.ogg' }]);
    });
});

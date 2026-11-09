import { describe, expect, it } from 'vitest';
import { parseJsonDocument } from './JsonDocumentParser';

describe('parseJsonDocument', () =>
{
    it('parses strict JSON in every mode', () =>
    {
        for(const mode of [ 'legacy', 'jsonc', 'auto' ] as const)
        {
            expect(parseJsonDocument('{"value":1}', mode)).toEqual({ value: 1 });
        }
    });

    it('parses comments and trailing commas in jsonc and auto modes', () =>
    {
        const source = '{ /* comment */ "value": 1, }';

        expect(parseJsonDocument(source, 'jsonc')).toEqual({ value: 1 });
        expect(parseJsonDocument(source, 'auto')).toEqual({ value: 1 });
    });

    it('rejects comments and trailing commas in legacy mode', () =>
    {
        expect(() => parseJsonDocument('{ "value": 1, }', 'legacy', 'config.json'))
            .toThrow(/strict JSON/);
    });

    it.each([
        "{ 'value': 1 }",
        '{ value: 1 }',
        '{ "value": 0x10 }',
        '{ "value": Infinity }'
    ])('rejects JSON5-only syntax: %s', source =>
    {
        expect(() => parseJsonDocument(source, 'jsonc', 'config.jsonc')).toThrow(/JSONC/);
        expect(() => parseJsonDocument(source, 'auto', 'config.json')).toThrow(/JSON\/JSONC/);
    });
});

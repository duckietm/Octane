import { describe, expect, it } from 'vitest';
import { DEFAULT_JSON_MODE, normalizeJsonModeAnswer, VALID_JSON_MODES } from '../../scripts/json-mode.mjs';

describe('JSON mode configuration', () =>
{
    it('uses jsonc as the comment-friendly default', () =>
    {
        expect(DEFAULT_JSON_MODE).toBe('jsonc');
        expect(VALID_JSON_MODES).toEqual([ 'legacy', 'jsonc', 'auto' ]);
    });

    it.each([
        [ '', 'jsonc' ],
        [ '1', 'jsonc' ],
        [ 'jsonc', 'jsonc' ],
        [ 'yes', 'jsonc' ],
        [ '2', 'legacy' ],
        [ 'json', 'legacy' ],
        [ 'legacy', 'legacy' ],
        [ 'no', 'legacy' ],
        [ 'auto', 'auto' ]
    ])('normalizes "%s" to "%s"', (input, expected) =>
    {
        expect(normalizeJsonModeAnswer(input)).toBe(expected);
    });

    it('rejects the removed json5 mode', () =>
    {
        expect(normalizeJsonModeAnswer('json5')).toBeNull();
    });
});

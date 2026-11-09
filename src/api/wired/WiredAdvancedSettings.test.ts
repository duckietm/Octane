import { describe, expect, it } from 'vitest';
import { isAdvancedAlwaysVisible } from './WiredAdvancedSettings';

describe('official advancedAlwaysVisible list', () => {
    it('covers the 26 AIR elements and their inheriting children', () => {
        const listed: Array<[string, number]> = [
            ['trigger', 29],
            ...[8, 38, 40, 42, 43, 45, 46].map((code): [string, number] => ['condition', code]),
            ...[34, 35, 39, 40, 41, 43, 45, 46, 47, 56, 57, 58, 59, 61, 62].map((code): [string, number] => ['action', code]),
            ...[8, 15, 18, 19].map((code): [string, number] => ['addon', code]),
            ['selector', 6],
            ['selector', 12]
        ];

        for (const [holder, code] of listed) expect(isAdvancedAlwaysVisible(holder, code), `${holder} ${code}`).toBe(true);
    });

    it('leaves everything else foldable, variables included (their codes overlap the addons)', () => {
        expect(isAdvancedAlwaysVisible('condition', 19)).toBe(false);
        expect(isAdvancedAlwaysVisible('action', 0)).toBe(false);
        expect(isAdvancedAlwaysVisible('variable', 8)).toBe(false);
        expect(isAdvancedAlwaysVisible(null, 29)).toBe(false);
    });
});

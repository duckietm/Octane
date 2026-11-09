import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getRemainingCooldownSeconds, shouldStartOwnCooldown } from './soundboardUi.helpers';

describe('soundboard UI helpers', () => {
    it('does not duplicate the external snapshot inside the singleton source', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/hooks/soundboard/useSoundboard.ts'), 'utf8');
        const stateScope = source.slice(source.indexOf('const useSoundboardState'), source.indexOf('export const useSoundboard'));

        expect(stateScope).not.toContain('useUserDataSnapshot(');
    });

    it('rounds a partial remaining second up', () => {
        expect(getRemainingCooldownSeconds(61_001, 2_000)).toBe(60);
    });

    it('returns zero when the cooldown has expired', () => {
        expect(getRemainingCooldownSeconds(2_000, 2_000)).toBe(0);
        expect(getRemainingCooldownSeconds(1_000, 2_000)).toBe(0);
    });

    it('starts cooldown only for the local account', () => {
        expect(shouldStartOwnCooldown(42, 42, 30)).toBe(true);
        expect(shouldStartOwnCooldown(42, 7, 30)).toBe(false);
        expect(shouldStartOwnCooldown(-1, -1, 30)).toBe(false);
    });

    it('does not start a zero-second cooldown', () => {
        expect(shouldStartOwnCooldown(42, 42, 0)).toBe(false);
    });
});

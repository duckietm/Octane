import { describe, expect, it } from 'vitest';
import { ltdRaffleResultText } from './useNotification';

describe('LTD raffle result notification', () => {
    it('uses the won text for a win and the lost text otherwise, as AIR does', () => {
        expect(ltdRaffleResultText(true)).toBe('You successfully bought an LTD!');
        expect(ltdRaffleResultText(false)).toBe('Unfortunately you were not lucky enough to get an LTD this time.');
    });
});

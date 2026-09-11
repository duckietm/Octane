import { describe, expect, it } from 'vitest';
import { detectTradingNameScam, isPotentialTradingScamName } from './TradingNameScamDetector';

describe('trading name-scam detector (class_3691.as)', () => {
    it('flags names that differ only by confusable characters', () => {
        expect(isPotentialTradingScamName('Habbo', 'Habb0')).toBe(true);
        expect(isPotentialTradingScamName('Lila', 'LiIa')).toBe(true);
        expect(isPotentialTradingScamName('Simo:Leo', 'Simo;Leo')).toBe(true);
    });

    it('flags up to two case-only changes but not a third', () => {
        expect(isPotentialTradingScamName('habbo', 'HAbbo')).toBe(true);
        expect(isPotentialTradingScamName('habbo', 'HABbo')).toBe(false);
    });

    it('flags up to two dropped or added small punctuation marks', () => {
        expect(isPotentialTradingScamName('Habbo', 'Ha.bbo')).toBe(true);
        expect(isPotentialTradingScamName('Ha.b.bo', 'Habbo')).toBe(true);
        expect(isPotentialTradingScamName('Habbo', 'H.a.b.bo')).toBe(false);
    });

    it('ignores identical, empty, unrelated and disallowed names', () => {
        expect(isPotentialTradingScamName('Habbo', 'Habbo')).toBe(false);
        expect(isPotentialTradingScamName('', 'Habbo')).toBe(false);
        expect(isPotentialTradingScamName('Habbo', 'Frank')).toBe(false);
        expect(isPotentialTradingScamName('Habbo', 'Habb0 ')).toBe(false);
        expect(isPotentialTradingScamName('Hab#bo', 'Habbo')).toBe(false);
    });

    it('collects the look-alikes in the room and in the friend list without duplicates', () => {
        const result = detectTradingNameScam('Habbo', ['Habb0', 'Frank', 'Habb0', 'habbo', 'Habbo'], ['HaBbo', 'Frank']);

        expect(result).toEqual({ similarInRoom: ['Habb0', 'habbo'], similarInFriends: ['HaBbo'], nameScamDetected: true });
        expect(detectTradingNameScam('Habbo', ['Frank'], [])).toEqual({ similarInRoom: [], similarInFriends: [], nameScamDetected: false });
        expect(detectTradingNameScam('Habbo', null, undefined).nameScamDetected).toBe(false);
    });
});

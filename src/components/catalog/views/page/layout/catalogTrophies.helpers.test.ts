import { describe, expect, it } from 'vitest';
import { getTrophyBaseName, getTrophyMetal, groupTrophyOffers, pickTrophyOffer } from './catalogTrophies.helpers';

const offer = (localizationId: string) => ({ localizationId });

describe('trophy offers (AIR TrophyCatalogWidget)', () => {
    it('reads the metal from the offer name', () => {
        expect(getTrophyMetal('a0 prizetrophy2_b')).toBe('b');
        expect(getTrophyMetal('prizetrophy_g')).toBe('g');
        expect(getTrophyMetal('prizetrophy_2011_g')).toBe('');
        expect(getTrophyMetal('prizetrophy_bb')).toBe('');
        expect(getTrophyMetal('trophy')).toBe('');
        expect(getTrophyBaseName('a0 prizetrophy2_s')).toBe('a0 prizetrophy2');
    });

    it('groups one model per base name in page order and picks a metal or the first offer', () => {
        const models = groupTrophyOffers([offer('a0 prizetrophy2_b'), offer('a0 prizetrophy_g'), offer('a0 prizetrophy2_g'), offer('prizetrophy_2011_r')]);

        expect(models.map((model) => model.base)).toEqual(['a0 prizetrophy2', 'a0 prizetrophy', 'prizetrophy_2011_r']);
        expect(pickTrophyOffer(models[0], 'g')?.localizationId).toBe('a0 prizetrophy2_g');
        expect(pickTrophyOffer(models[0], 's')?.localizationId).toBe('a0 prizetrophy2_b');
        expect(pickTrophyOffer(models[2], 'b')?.localizationId).toBe('prizetrophy_2011_r');
        expect(pickTrophyOffer(null, 'g')).toBeNull();
    });
});

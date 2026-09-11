import { describe, expect, it } from 'vitest';
import { getAdjacentTrophyOffer, getTrophyBaseName, getTrophyColour, groupTrophyOffers } from './catalogTrophies.helpers';

const offer = (localizationId: string) => ({ localizationId }) as any;

const offers = [offer('trophy_g'), offer('trophy_s'), offer('trophy_b'), offer('cup_g'), offer('cup_b'), offer('prizetrophy_2011_b')];

describe('catalog trophies helpers', () => {
    it('reads the colour suffix and the model name like the official widget', () => {
        expect(getTrophyColour('trophy_g')).toBe('g');
        expect(getTrophyColour('trophy_x')).toBe('');
        expect(getTrophyColour('prizetrophy_2011_b')).toBe('');
        expect(getTrophyBaseName('trophy_s')).toBe('trophy');
        expect(getTrophyBaseName('prizetrophy_2011_b')).toBe('prizetrophy_2011_b');
    });

    it('groups colour variants under one model in page order', () => {
        expect(groupTrophyOffers(offers).map((group) => [group.baseName, group.offers.length])).toEqual([
            ['trophy', 3],
            ['cup', 2],
            ['prizetrophy_2011_b', 1]
        ]);
    });

    it('steps to the next model keeping the selected colour when it exists', () => {
        expect(getAdjacentTrophyOffer(offers, offers[0], 1)).toBe(offers[3]);
        expect(getAdjacentTrophyOffer(offers, offers[1], 1)).toBe(offers[3]);
        expect(getAdjacentTrophyOffer(offers, offers[3], -1)).toBe(offers[0]);
    });

    it('wraps around at both ends and starts from the first model without a selection', () => {
        expect(getAdjacentTrophyOffer(offers, offers[5], 1)).toBe(offers[0]);
        expect(getAdjacentTrophyOffer(offers, offers[0], -1)).toBe(offers[5]);
        expect(getAdjacentTrophyOffer(offers, null, 1)).toBe(offers[0]);
        expect(getAdjacentTrophyOffer([], null, 1)).toBeNull();
    });
});

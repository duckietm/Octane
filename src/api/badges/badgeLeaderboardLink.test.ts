import { describe, expect, it } from 'vitest';
import { parseBadgeLeaderboardLink } from './badgeLeaderboardLink';

describe('parseBadgeLeaderboardLink', () => {
    it.each([
        [['0', '-1', '0'], { key: 'totalBadges', page: 0 }],
        [['2', '-1', '3'], { key: 'achievementLevel', page: 3 }],
        [['1', '2', '1'], { key: 'rarity-rare', page: 1 }],
        [['1', '6'], { key: 'rarity-unique', page: 0 }],
        [['1', '-1', '0'], { key: 'totalBadges', page: 0 }],
        [['9', 'x', '-4'], { key: 'totalBadges', page: 0 }],
        [[], { key: 'totalBadges', page: 0 }]
    ])('%j', (args, expected) => {
        expect(parseBadgeLeaderboardLink(args)).toEqual(expected);
    });
});

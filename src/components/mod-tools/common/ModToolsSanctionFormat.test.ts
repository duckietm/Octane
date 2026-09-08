import { describe, expect, it } from 'vitest';
import {
    canCloseWithDefaultSanction,
    flattenCfhTopicIds,
    formatDefaultSanctionLabel,
    getInitialTopicId,
    REPORTED_CATEGORY_TOPIC_REQUIRED
} from './ModToolsSanctionFormat';

describe('formatDefaultSanctionLabel', () => {
    it('writes hours up to a day and days past it', () => {
        expect(formatDefaultSanctionLabel({ name: 'Mute', sanctionLengthInHours: 2, avatarOnly: false })).toBe('Mute 2h');
        expect(formatDefaultSanctionLabel({ name: 'Ban', sanctionLengthInHours: 24, avatarOnly: false })).toBe('Ban 24h');
        expect(formatDefaultSanctionLabel({ name: 'Ban', sanctionLengthInHours: 168, avatarOnly: false })).toBe('Ban 7 days');
    });

    it('marks avatar-only sanctions and appends the trade lock and machine ban info', () => {
        expect(formatDefaultSanctionLabel({ name: 'Ban', sanctionLengthInHours: 48, avatarOnly: true })).toBe('Ban (avatar) 2 days');
        expect(
            formatDefaultSanctionLabel({
                name: 'Ban',
                sanctionLengthInHours: 48,
                avatarOnly: false,
                tradeLockInfo: 'trade lock 1 week',
                machineBanInfo: 'machine ban'
            })
        ).toBe('Ban 2 days & trade lock 1 week & machine ban');
        expect(formatDefaultSanctionLabel({ name: 'Ban', sanctionLengthInHours: 1, avatarOnly: false, tradeLockInfo: '', machineBanInfo: '' })).toBe('Ban 1h');
    });

    it('is empty without data', () => {
        expect(formatDefaultSanctionLabel(null)).toBe('');
    });
});

describe('flattenCfhTopicIds', () => {
    it('lists every topic of every category in order', () => {
        expect(flattenCfhTopicIds([{ topics: [{ id: 5 }, { id: 6 }] }, { topics: [] }, { topics: [{ id: 1 }] }])).toEqual([5, 6, 1]);
        expect(flattenCfhTopicIds(null)).toEqual([]);
    });
});

describe('getInitialTopicId', () => {
    it('preselects the reported topic when it is in the list', () => {
        expect(getInitialTopicId([1, 5, 6], 2, 6)).toBe(6);
    });

    it('falls back to topic 1 for a category 3 / topic 28 issue, and to nothing otherwise', () => {
        expect(getInitialTopicId([1, 5, 6], 3, REPORTED_CATEGORY_TOPIC_REQUIRED)).toBe(1);
        expect(getInitialTopicId([5, 6], 3, REPORTED_CATEGORY_TOPIC_REQUIRED)).toBe(-1);
        expect(getInitialTopicId([1, 5, 6], 2, 99)).toBe(-1);
    });
});

describe('canCloseWithDefaultSanction', () => {
    it('refuses a topic-28 report without a topic and allows everything else', () => {
        expect(canCloseWithDefaultSanction(-1, REPORTED_CATEGORY_TOPIC_REQUIRED)).toBe(false);
        expect(canCloseWithDefaultSanction(0, REPORTED_CATEGORY_TOPIC_REQUIRED)).toBe(false);
        expect(canCloseWithDefaultSanction(5, REPORTED_CATEGORY_TOPIC_REQUIRED)).toBe(true);
        expect(canCloseWithDefaultSanction(-1, 5)).toBe(true);
    });
});

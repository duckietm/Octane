import { describe, expect, it } from 'vitest';
import {
    getActiveNewFeatureKeys,
    getNewFeatureConditionState,
    getNewFeatureCountdownUnits,
    getNewFeaturePendingTimes,
    NewFeatureConditionState,
    newFeatureColorToCss,
    newFeatureHexToUint,
    readNewFeatureConfig
} from './NewFeatureNotification';

const reader = (values: Record<string, string>) => (key: string) => values[key] ?? '';

describe('NewFeatureNotification config', () => {
    it('reads the active keys, dropping empty entries', () => {
        expect(getActiveNewFeatureKeys(reader({ 'notifications.new_feature.active': 'rewardtrack_intro,,daily_tasks' }))).toEqual(['rewardtrack_intro', 'daily_tasks']);
        expect(getActiveNewFeatureKeys(reader({}))).toEqual([]);
    });

    it('defaults the type to normal and the colour to #686661', () => {
        const config = readNewFeatureConfig(
            'rewardtrack_intro',
            reader({
                'notifications.new_feature.image.rewardtrack_intro': 'reward_track_small_icon',
                'notifications.new_feature.internal_link.rewardtrack_intro': 'reward_track/open/introduction'
            })
        );

        expect(config).toEqual({
            key: 'rewardtrack_intro',
            type: 'normal',
            expiry: '',
            countDownTo: '',
            image: 'reward_track_small_icon',
            color: '#686661',
            internalLink: 'reward_track/open/introduction',
            externalLink: ''
        });
    });

    it('waits for the server time only for an expiry, or a countdown on the countdown type', () => {
        const base = readNewFeatureConfig('x', reader({}));

        expect(getNewFeaturePendingTimes(base)).toEqual({ expiry: false, countdown: false });
        expect(getNewFeaturePendingTimes({ ...base, expiry: '2026-12-01 12:00' })).toEqual({ expiry: true, countdown: false });
        expect(getNewFeaturePendingTimes({ ...base, countDownTo: '2026-12-01 12:00' })).toEqual({ expiry: false, countdown: false });
        expect(getNewFeaturePendingTimes({ ...base, type: 'countdown', countDownTo: '2026-12-01 12:00' })).toEqual({ expiry: false, countdown: true });
    });
});

describe('getNewFeatureConditionState', () => {
    const tracks = [
        { id: 'introduction', complete: false },
        { id: 'summer', complete: true }
    ];

    it('shows a notification without (or with an unknown) condition', () => {
        expect(getNewFeatureConditionState('', tracks)).toBe(NewFeatureConditionState.VISIBLE);
        expect(getNewFeatureConditionState('reward_track_incomplete', tracks)).toBe(NewFeatureConditionState.VISIBLE);
        expect(getNewFeatureConditionState('something:else', tracks)).toBe(NewFeatureConditionState.VISIBLE);
    });

    it('follows reward_track_incomplete:<track>', () => {
        expect(getNewFeatureConditionState('reward_track_incomplete:introduction', tracks)).toBe(NewFeatureConditionState.VISIBLE);
        expect(getNewFeatureConditionState('reward_track_incomplete:summer', tracks)).toBe(NewFeatureConditionState.HIDDEN);
        expect(getNewFeatureConditionState('reward_track_incomplete:winter', tracks)).toBe(NewFeatureConditionState.UNAVAILABLE);
        expect(getNewFeatureConditionState('reward_track_incomplete:introduction', null)).toBe(NewFeatureConditionState.UNAVAILABLE);
    });
});

describe('getNewFeatureCountdownUnits', () => {
    it('starts at the largest unit reached, keeping three counters', () => {
        // 2 days 3 hours 4 minutes 5 seconds
        expect(getNewFeatureCountdownUnits(2 * 86400 + 3 * 3600 + 4 * 60 + 5)).toEqual([
            { unit: 'days', value: '02' },
            { unit: 'hours', value: '03' },
            { unit: 'minutes', value: '04' }
        ]);
        // under an hour it still shows three counters: hours, minutes, seconds
        expect(getNewFeatureCountdownUnits(65)).toEqual([
            { unit: 'hours', value: '00' },
            { unit: 'minutes', value: '01' },
            { unit: 'seconds', value: '05' }
        ]);
        expect(getNewFeatureCountdownUnits(-5)[2]).toEqual({ unit: 'seconds', value: '00' });
        expect(getNewFeatureCountdownUnits(3 * 604800, 2)).toEqual([
            { unit: 'weeks', value: '03' },
            { unit: 'days', value: '00' }
        ]);
    });
});

describe('colours', () => {
    it('parses and formats hex colours', () => {
        expect(newFeatureHexToUint('#686661')).toBe(0x686661);
        expect(newFeatureHexToUint('71af24')).toBe(0x71af24);
        expect(newFeatureColorToCss(0x0000ff)).toBe('#0000ff');
    });
});

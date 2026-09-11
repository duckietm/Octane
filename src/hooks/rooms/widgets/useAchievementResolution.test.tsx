import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    handlers: new Map<unknown, (event: unknown) => void>()
}));

vi.mock('../../../api', () => ({ SendMessageComposer: mocks.send }));

vi.mock('../../events', () => ({
    useMessageEvent: (event: unknown, handler: (event: unknown) => void) => {
        mocks.handlers.set(event, handler);
    }
}));

vi.mock('@octane/renderer', () => ({
    AchievementResolutionsMessageEvent: class {},
    AchievementResolutionProgressMessageEvent: class {},
    AchievementResolutionCompletedMessageEvent: class {},
    GetResolutionAchievementsMessageComposer: class GetResolutionAchievementsMessageComposer {
        constructor(
            public stuffId: number,
            public achievementId: number
        ) {}
    },
    ResetResolutionAchievementMessageComposer: class ResetResolutionAchievementMessageComposer {
        constructor(public stuffId: number) {}
    }
}));

import {
    AchievementResolutionProgressMessageEvent,
    AchievementResolutionsMessageEvent,
    GetResolutionAchievementsMessageComposer,
    ResetResolutionAchievementMessageComposer
} from '@octane/renderer';
import { useAchievementResolution } from './useAchievementResolution';

let hook: ReturnType<typeof useAchievementResolution> = null;

const Harness = () => {
    hook = useAchievementResolution();

    return null;
};

const picker = () => ({
    getParser: () => ({
        stuffId: 42,
        endTime: 1000,
        achievements: [
            { achievementId: 7, level: 2, badgeId: 'ACH_Foo3', requiredLevel: 3, state: 0, enabled: true },
            { achievementId: 8, level: 9, badgeId: 'ACH_Bar9', requiredLevel: 9, state: 1, enabled: false }
        ]
    })
});

describe('useAchievementResolution', () => {
    beforeEach(() => {
        mocks.send.mockClear();
        mocks.handlers.clear();
    });

    it('keeps the candidates and the furni the picker is about', () => {
        render(<Harness />);

        act(() => mocks.handlers.get(AchievementResolutionsMessageEvent)(picker()));

        expect(hook.resolution.mode).toBe('picker');
        expect(hook.resolution).toMatchObject({ stuffId: 42, endTime: 1000 });
        expect((hook.resolution as { candidates: unknown[] }).candidates).toHaveLength(2);
    });

    it('promises an achievement on the furni the window is about', () => {
        render(<Harness />);
        act(() => mocks.handlers.get(AchievementResolutionsMessageEvent)(picker()));
        mocks.send.mockClear();

        act(() => hook.select(7));

        const composer = mocks.send.mock.calls[0][0] as { stuffId: number; achievementId: number };

        expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(GetResolutionAchievementsMessageComposer);
        expect(composer.stuffId).toBe(42);
        expect(composer.achievementId).toBe(7);
    });

    it('re-selecting resets and then asks the furni again, as the official window does', () => {
        render(<Harness />);
        act(() =>
            mocks.handlers.get(AchievementResolutionProgressMessageEvent)({
                getParser: () => ({
                    stuffId: 42,
                    achievementId: 7,
                    requiredLevelBadgeCode: 'ACH_Foo3',
                    userProgress: 4,
                    totalProgress: 10,
                    endTime: 1000
                })
            })
        );
        mocks.send.mockClear();

        act(() => hook.reset());

        expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(ResetResolutionAchievementMessageComposer);
        expect(mocks.send.mock.calls[1][0]).toBeInstanceOf(GetResolutionAchievementsMessageComposer);
        expect((mocks.send.mock.calls[1][0] as { achievementId: number }).achievementId).toBe(0);
    });

    it('sends nothing without a furni to talk about', () => {
        render(<Harness />);
        mocks.send.mockClear();

        act(() => {
            hook.select(7);
            hook.reset();
        });

        expect(mocks.send).not.toHaveBeenCalled();
    });
});

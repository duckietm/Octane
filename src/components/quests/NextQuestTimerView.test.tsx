/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextQuestTimerView } from './NextQuestTimerView';

/** A quest that counts its wait down from the moment it arrived, like QuestMessageData. */
class DelayedQuest {
    public campaignCode = 'room_builder';
    private _wait: number;
    private _receivedAt = Date.now();

    constructor(wait: number) {
        this._wait = wait;
    }

    public get waitPeriodSeconds(): number {
        if (this._wait < 1) return 0;

        return Math.max(0, this._wait - Math.floor((Date.now() - this._receivedAt) / 1000));
    }

    public set waitPeriodSeconds(value: number) {
        this._wait = value;
    }
}

const mocks = vi.hoisted(() => ({
    trackedQuest: null as unknown,
    isInRoom: true,
    releaseDelayedQuest: vi.fn()
}));

vi.mock('../../hooks', () => ({
    useQuests: () => ({ trackedQuest: mocks.trackedQuest, isInRoom: mocks.isInRoom, questClock: 0, releaseDelayedQuest: mocks.releaseDelayedQuest })
}));

describe('NextQuestTimerView', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
        mocks.releaseDelayedQuest.mockReset();
        mocks.isInRoom = true;
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('stays closed while the tracked quest has no wait', () => {
        mocks.trackedQuest = new DelayedQuest(0);

        const { container } = render(<NextQuestTimerView />);

        expect(container.firstChild).toBeNull();
    });

    it('docks contracted and expands to the delayed message and the more info link', () => {
        mocks.trackedQuest = new DelayedQuest(90);

        const { container } = render(<NextQuestTimerView />);
        const timer = container.querySelector('.octane-next-quest-timer');

        expect(timer).toHaveAttribute('data-expanded', 'false');
        expect(container.querySelector('.octane-next-quest-timer-desc')).toBeNull();

        fireEvent.click(container.querySelector('.octane-next-quest-timer-toggle'));

        expect(timer).toHaveAttribute('data-expanded', 'true');
        expect(container.querySelector('.octane-next-quest-timer-desc')).not.toBeNull();
        expect(screen.getByRole('button', { name: /more info|quests\.tracker\.moreinfo/i })).toBeInTheDocument();
    });

    it('hides the more info link outside a room', () => {
        mocks.trackedQuest = new DelayedQuest(90);
        mocks.isInRoom = false;

        const { container } = render(<NextQuestTimerView />);

        fireEvent.click(container.querySelector('.octane-next-quest-timer-toggle'));

        expect(container.querySelector('.octane-next-quest-timer-moreinfo')).toBeNull();
    });

    it('hands the quest back to the tracker once the wait is over', () => {
        const quest = new DelayedQuest(3);

        mocks.trackedQuest = quest;

        const { container } = render(<NextQuestTimerView />);

        expect(container.querySelector('.octane-next-quest-timer')).not.toBeNull();
        expect(mocks.releaseDelayedQuest).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(container.querySelector('.octane-next-quest-timer')).toBeNull();
        expect(mocks.releaseDelayedQuest).toHaveBeenCalledWith(quest);
    });
});

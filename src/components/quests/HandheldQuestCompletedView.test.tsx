import * as Renderer from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const quests = vi.hoisted(() => ({ last: false, requestNextQuest: vi.fn(), clearCompletion: vi.fn() }));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfiguration: () => ({ getValue: (_key: string, fallback: unknown) => fallback ?? '' })
}));

vi.mock('../../hooks', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useQuests: () => ({
        completion: {
            quest: {
                campaignCode: 'room_builder',
                localizationCode: 'room_builder',
                lastQuestInCampaign: quests.last,
                activityPointType: 0,
                rewardCurrencyAmount: 10,
                catalogPageName: 'pixel_shop'
            },
            showDialog: true,
            receivedAt: 1
        },
        requestNextQuest: quests.requestNextQuest,
        clearCompletion: quests.clearCompletion
    })
}));

const { QuestCompletedView } = await import('./QuestCompletedView');

const show = () => {
    render(<QuestCompletedView />);
    act(() => vi.advanceTimersByTime(2100));
};

describe('finished quest on a phone', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        for (const spy of [quests.requestNextQuest, quests.clearCompletion]) spy.mockClear();
        (Renderer.CreateLinkEvent as unknown as { mockClear: () => void }).mockClear();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('shows a centred card after the delay, with the reward, and asks for the next quest', () => {
        quests.last = false;
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        render(<QuestCompletedView />);

        expect(screen.queryByTestId('handheld-quest-completed')).toBeNull();
        act(() => vi.advanceTimersByTime(2100));

        expect(screen.getByTestId('handheld-quest-completed')).toHaveTextContent('Quest completed!');
        fireEvent.click(screen.getByRole('button', { name: 'Next quest' }));
        expect(quests.requestNextQuest).toHaveBeenCalled();
        expect(quests.clearCompletion).toHaveBeenCalled();
    });

    it('opens the shop page of the quest from its link', () => {
        quests.last = false;
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        show();

        fireEvent.click(screen.getByRole('button', { name: /Spend your/ }));
        expect(Renderer.CreateLinkEvent).toHaveBeenCalledWith('catalog/open/pixel_shop');
    });

    it('offers more quests after the last quest of a campaign', () => {
        quests.last = true;
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'landscape' } }));
        show();

        expect(screen.queryByRole('button', { name: /Spend your/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'More quests' }));
        expect(Renderer.CreateLinkEvent).toHaveBeenCalledWith('quests/show');
    });

    it('keeps the desktop dialog when not on a phone', () => {
        quests.last = false;
        show();

        expect(screen.queryByTestId('handheld-quest-completed')).toBeNull();
        expect(screen.getByText('Next quest')).toBeInTheDocument();
    });
});

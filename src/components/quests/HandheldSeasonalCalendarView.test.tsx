import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const calendar = vi.hoisted(() => ({ close: vi.fn(), goToQuestRoom: vi.fn(), acceptQuest: vi.fn(), rejectQuest: vi.fn() }));
const store = vi.hoisted(() => ({ quests: [] as unknown[] }));

const quest = (day: number, completed = false) => ({
    id: 100 + day,
    campaignCode: `xmas_${day}`,
    localizationCode: 'xmas',
    sortOrder: day,
    completedCampaign: completed,
    accepted: false,
    activityPointType: 0,
    rewardCurrencyAmount: 0,
    completedQuestsInCampaign: 0,
    questCountInCampaign: 1,
    waitPeriodSeconds: 0,
    secondsLeft: 0,
    isSeasonal: true,
    imageVersion: ''
});

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfiguration: () => ({ getValue: (_key: string, fallback: unknown) => fallback ?? '' })
}));

vi.mock('../../hooks', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useSeasonalCalendar: () => ({
        enabled: true,
        prefix: 'xmas',
        quests: store.quests,
        isVisible: true,
        dailyOffer: null,
        close: calendar.close,
        goToQuestRoom: calendar.goToQuestRoom
    }),
    useQuests: () => ({ acceptQuest: calendar.acceptQuest, rejectQuest: calendar.rejectQuest }),
    useRoom: () => ({ roomSession: { roomId: 1 } }),
    usePurse: () => ({ getCurrencyAmount: () => 7 }),
    getSeasonalCalendarSettings: () => ({ enabled: true, prefix: 'xmas', currency: 5, maximumEntities: 24 }),
    getSeasonalQuestRoomIds: () => '12'
}));

// One array for every render, as the shared hook keeps it.
store.quests = [quest(1, true), quest(3)];

const { SeasonalCalendarView } = await import('./SeasonalCalendarView');

const layout = (orientation: 'portrait' | 'landscape') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

describe('seasonal calendar on a phone', () => {
    beforeEach(() => {
        for (const spy of Object.values(calendar)) spy.mockClear();
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('shows every day as a tile; only the open day opens', () => {
        layout('portrait');
        render(<SeasonalCalendarView />);

        const days = screen.getByTestId('handheld-seasonal-days');

        expect(within(days).getByTestId('seasonal-day-1').tagName).not.toBe('BUTTON');
        expect(within(days).getByTestId('seasonal-day-2').tagName).not.toBe('BUTTON');
        expect(within(days).getByTestId('seasonal-day-3').tagName).toBe('BUTTON');
        expect(within(days).getByTestId('seasonal-day-3')).toHaveAttribute('data-today');
    });

    it('opens the day as a page with Back upright, and accepts the quest as the desktop does', () => {
        layout('portrait');
        render(<SeasonalCalendarView />);

        fireEvent.click(screen.getByTestId('seasonal-day-3'));
        expect(screen.queryByTestId('handheld-seasonal-days')).toBeNull();
        expect(screen.getByTestId('handheld-seasonal-details')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Back/ }));
        expect(screen.getByTestId('handheld-seasonal-days')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('seasonal-day-3'));
        fireEvent.click(screen.getByRole('button', { name: 'Accept quest' }));
        expect(calendar.acceptQuest).toHaveBeenCalledWith(103);
        expect(calendar.close).toHaveBeenCalled();
        expect(calendar.goToQuestRoom).toHaveBeenCalled();
    });

    it('shows the day beside the tiles on its side, with the campaign room link', () => {
        layout('landscape');
        render(<SeasonalCalendarView />);

        fireEvent.click(screen.getByTestId('seasonal-day-3'));
        expect(screen.getByTestId('handheld-seasonal-days')).toBeInTheDocument();
        expect(screen.getByTestId('seasonal-day-3')).toHaveAttribute('data-selected');

        fireEvent.click(screen.getByRole('button', { name: 'Go to the campaign room' }));
        expect(calendar.goToQuestRoom).toHaveBeenCalled();
    });

    it('keeps the offer of the day and closes from the header', () => {
        layout('portrait');
        render(<SeasonalCalendarView />);

        expect(screen.getByRole('button', { name: 'To the Shop' })).toBeDisabled();
        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close') as HTMLElement);
        expect(calendar.close).toHaveBeenCalled();
    });

    it('keeps the desktop strip when not on a phone', () => {
        render(<SeasonalCalendarView />);

        expect(screen.queryByTestId('handheld-seasonal-days')).toBeNull();
        expect(document.querySelector('.octane-seasonal-strip')).not.toBeNull();
    });
});

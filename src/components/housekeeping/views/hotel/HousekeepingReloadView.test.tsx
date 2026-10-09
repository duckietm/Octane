/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingReloadView } from './HousekeepingReloadView';

const reloadHotel = vi.fn((target: string) => Promise.resolve({ ok: target !== 'items', actionId: null, message: target }));
const confirm = vi.fn((_message: string, onConfirm: () => void) => onConfirm());

vi.mock('../../../../hooks', () => ({
    useHousekeeping: () => ({ isActionPending: false, reloadHotel }),
    useHousekeepingConfirm: () => confirm
}));

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    formatHousekeepingDateTime: () => 'now',
    HOUSEKEEPING_RELOAD_TARGETS: ['catalog', 'texts', 'permissions', 'items', 'navigator', 'config', 'wordfilter']
}));

describe('HousekeepingReloadView', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('offers one reload per server table', () => {
        render(<HousekeepingReloadView />);

        expect(screen.getAllByText('housekeeping.hotel.reload.run')).toHaveLength(7);
    });

    it('asks first, then reloads the chosen table and shows when it was done', async () => {
        render(<HousekeepingReloadView />);

        fireEvent.click(screen.getAllByText('housekeeping.hotel.reload.run')[2]);

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(reloadHotel).toHaveBeenCalledWith('permissions');
        await waitFor(() => expect(screen.getByText('housekeeping.hotel.reload.done_at')).toBeTruthy());
    });

    it('reloads every table in order, spaced past the rate limit, and names the ones that failed', async () => {
        vi.useFakeTimers();
        render(<HousekeepingReloadView />);

        fireEvent.click(screen.getByText('housekeeping.hotel.reload.all'));

        // The first one goes at once; each next one waits for the 2.1s spacing.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(reloadHotel).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2_100 * 6);
        });

        expect(reloadHotel.mock.calls.map(([target]) => target)).toEqual(['catalog', 'texts', 'permissions', 'items', 'navigator', 'config', 'wordfilter']);
        expect(screen.getByText('housekeeping.hotel.reload.all.partial')).toBeTruthy();
        expect(screen.getByText('housekeeping.hotel.reload.failed_at')).toBeTruthy();
    });
});

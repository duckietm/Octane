import { GetLocalizationManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingApi } from '../../../../api';
import { useHandheldStore } from '../../../../state/handheldStore';
import { HousekeepingWordFilterView } from '../hotel/HousekeepingWordFilterView';
import { HousekeepingPermissionsTab } from './HousekeepingPermissionsTab';

const store = {
    isActionPending: false,
    setPermission: vi.fn(async () => ({ ok: true })),
    addFilterWord: vi.fn(async () => ({ ok: true })),
    removeFilterWord: vi.fn(async () => ({ ok: true }))
};
const confirm = vi.fn();

// Texts read as their keys.
vi.mocked(GetLocalizationManager).mockImplementation(() => ({ getValue: (key: string) => key, getValueWithParameters: (key: string) => key }) as never);

vi.mock('../../../../hooks', () => ({
    useHousekeeping: () => store,
    useHousekeepingConfirm: () => confirm
}));

const LISTS: Record<string, unknown> = {
    'hotel.permissions': {
        columns: ['permission', 'comment', 'max', 'rank:1:1:0:Player', 'rank:7:1:1:Administrator', 'rank:9:0:0:Owner'],
        rows: [['cmd_alert', 'Send a hotel alert', '1', '0', '1', '1']]
    },
    'hotel.wordfilter': { columns: ['word', 'replacement', 'hide', 'report', 'prefix', 'mute'], rows: [['scam', 'bobba', '0', '1', '0', '0']] }
};

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const setLayout = (active: boolean) => act(() => useHandheldStore.setState({ layout: { active, orientation: 'portrait' } }));

describe('Housekeeping matrix and word filter on a phone', () => {
    beforeEach(() => {
        vi.spyOn(HousekeepingApi, 'requestList').mockImplementation(
            async (listKey: string) => ({ listKey, targetId: 0, ok: true, message: '', ...(LISTS[listKey] as object) }) as never
        );
        store.setPermission.mockClear();
        confirm.mockClear();
        setLayout(true);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        setLayout(false);
    });

    it('shows a permission as a card of ranks that saves through the same call, asks first for the own rank, locks the rest', async () => {
        render(<HousekeepingPermissionsTab />);
        await flush();

        expect(screen.getAllByTestId('hk-permission-card')).toHaveLength(1);
        expect(document.querySelector('table')).toBeNull();

        fireEvent.click(screen.getByRole('checkbox', { name: 'cmd_alert · Player' }));
        await flush();
        expect(store.setPermission).toHaveBeenCalledWith('cmd_alert', 1, 1);

        fireEvent.click(screen.getByRole('checkbox', { name: 'cmd_alert · Administrator' }));
        expect(confirm).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('checkbox', { name: 'cmd_alert · Owner' }).getAttribute('aria-disabled')).toBe('true');
    });

    it('shows a filtered word as a card whose remove asks for confirmation', async () => {
        render(<HousekeepingWordFilterView />);
        await flush();

        expect(screen.getByTestId('hk-wordfilter-cards').textContent).toContain('scam');
        fireEvent.click(screen.getByRole('button', { name: 'housekeeping.hotel.wordfilter.remove scam' }));
        expect(confirm).toHaveBeenCalledTimes(1);
    });
});

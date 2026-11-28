import { GetLocalizationManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingApi, HousekeepingTabId } from '../../../../api';
import { useHandheldStore } from '../../../../state/handheldStore';
import { HousekeepingListView } from './HousekeepingListView';

const store = { lookupUserById: vi.fn(), lookupRoomById: vi.fn(), setActiveTab: vi.fn() };

// Texts read as their keys.
vi.mocked(GetLocalizationManager).mockImplementation(() => ({ getValue: (key: string) => key, getValueWithParameters: (key: string) => key }) as never);

vi.mock('../../../../hooks', () => ({
    useHousekeepingStore: () => store,
    useHasPermission: () => false
}));

const LIST = {
    listKey: 'hotel.online',
    targetId: 0,
    ok: true,
    message: '',
    columns: ['id', 'user', 'rank', 'since'],
    rows: [
        ['1043', 'SunnyDays', '1', '0'],
        ['12', 'Lilly', '5', '0']
    ]
};

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const setLayout = (active: boolean) => act(() => useHandheldStore.setState({ layout: { active, orientation: 'portrait' } }));

describe('HousekeepingListView', () => {
    beforeEach(() => {
        vi.spyOn(HousekeepingApi, 'requestList').mockResolvedValue(LIST);
        store.lookupUserById = vi.fn();
        store.setActiveTab = vi.fn();
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        setLayout(false);
    });

    it('shows a row as a card on a phone, opens it as a page, and opens its user through the same lookup', async () => {
        setLayout(true);
        render(<HousekeepingListView hotelWide lists={[{ key: 'hotel.online', labelKey: 'housekeeping.list.hotel.online' }]} targetId={0} />);
        await flush();

        const cards = screen.getAllByTestId('hk-list-card');

        expect(cards).toHaveLength(2);
        expect(cards[1].textContent).toContain('Lilly');
        expect(document.querySelector('table')).toBeNull();

        fireEvent.click(cards[1]);
        const detail = screen.getByTestId('hk-list-detail');

        expect(detail.textContent).toContain('housekeeping.list.column.rank');
        fireEvent.click(screen.getByText('housekeeping.audit.detail.open_user'));
        expect(store.setActiveTab).toHaveBeenCalledWith(HousekeepingTabId.USERS);
        expect(store.lookupUserById).toHaveBeenCalledWith(12);

        fireEvent.click(screen.getByText('Back'));
        expect(screen.getAllByTestId('hk-list-card')).toHaveLength(2);
    });

    it('keeps the table on the desktop', async () => {
        render(<HousekeepingListView hotelWide lists={[{ key: 'hotel.online', labelKey: 'housekeeping.list.hotel.online' }]} targetId={0} />);
        await flush();

        expect(document.querySelector('table')).toBeTruthy();
        expect(screen.queryByTestId('hk-list-card')).toBeNull();
    });
});

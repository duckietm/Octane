import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInventoryTrade, useWiredTrading } from '../../hooks';
import { InventoryView } from './InventoryView';

vi.mock('../../hooks', () => ({
    useInventoryBadges: vi.fn(() => ({ badgeCodes: [] })),
    useInventoryFurni: vi.fn(() => ({ groupItems: [] })),
    useInventoryTrade: vi.fn(),
    useWiredTrading: vi.fn(),
    useInventoryUnseenTracker: vi.fn(() => ({ getCount: () => 0 })),
    useMessageEvent: vi.fn(),
    useOctaneEvent: vi.fn(),
}));
vi.mock('./views/furniture/InventoryWiredTradeView', () => ({ InventoryWiredTradeView: () => <div className="wired-trade" /> }));
vi.mock('./views/furniture/InventoryTradeView', () => ({ InventoryTradeView: () => <div className="user-trade" /> }));
vi.mock('./views/furniture/InventoryFurnitureView', () => ({ InventoryFurnitureView: () => null }));
vi.mock('./views/furniture/InventoryFurnitureDeleteView', () => ({ InventoryFurnitureDeleteView: () => null }));
vi.mock('./views/prefix/InventoryPrefixView', () => ({ InventoryPrefixView: () => null }));
vi.mock('./views/furniture/InventoryTradeNameScamWarningView', () => ({ InventoryTradeNameScamWarningView: () => null }));

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('InventoryView', () => {
    it('closing the inventory during a wired trade cancels the trade, as AIR closingInventoryView does', () => {
        const cancel = vi.fn();
        const stopTrading = vi.fn();
        vi.mocked(useInventoryTrade).mockReturnValue({ isTrading: false, stopTrading } as any);
        vi.mocked(useWiredTrading).mockReturnValue({ isOpen: true, cancel } as any);

        render(<InventoryView />);

        expect(document.querySelector('.wired-trade')).not.toBeNull();
        fireEvent.click(document.querySelector('.octane-card-close-button'));

        expect(cancel).toHaveBeenCalledTimes(1);
        expect(stopTrading).not.toHaveBeenCalled();
    });

    it('closing during a user trade stops that trade only', () => {
        const cancel = vi.fn();
        const stopTrading = vi.fn();
        vi.mocked(useInventoryTrade).mockReturnValue({ isTrading: true, stopTrading } as any);
        vi.mocked(useWiredTrading).mockReturnValue({ isOpen: false, cancel } as any);

        render(<InventoryView />);
        fireEvent.click(document.querySelector('.octane-card-close-button'));

        expect(stopTrading).toHaveBeenCalledTimes(1);
        expect(cancel).not.toHaveBeenCalled();
    });

    it('minimises a user trade while another tab is open and brings it back on continue', () => {
        const stopTrading = vi.fn();
        vi.mocked(useInventoryTrade).mockReturnValue({ isTrading: true, stopTrading } as any);
        vi.mocked(useWiredTrading).mockReturnValue({ isOpen: false, cancel: vi.fn() } as any);

        render(<InventoryView />);

        expect(document.querySelector('.user-trade')).not.toBeNull();
        expect(document.querySelector('.octane-trade-minimized')).toBeNull();

        const tabs = document.querySelectorAll('.octane-card-tab-item');

        // The last tab is never one a trade is made on.
        fireEvent.click(tabs[tabs.length - 1]);

        expect(document.querySelector('.user-trade')).toBeNull();
        expect(document.querySelector('.octane-trade-minimized')).not.toBeNull();
        expect(stopTrading).not.toHaveBeenCalled();

        fireEvent.click(document.querySelector('.octane-trade-minimized__button.is-continue'));

        expect(document.querySelector('.user-trade')).not.toBeNull();
        expect(document.querySelector('.octane-trade-minimized')).toBeNull();
    });

    it('cancelling from the minimised bar stops the trade', () => {
        const stopTrading = vi.fn();
        vi.mocked(useInventoryTrade).mockReturnValue({ isTrading: true, stopTrading } as any);
        vi.mocked(useWiredTrading).mockReturnValue({ isOpen: false, cancel: vi.fn() } as any);

        render(<InventoryView />);

        const tabs = document.querySelectorAll('.octane-card-tab-item');

        fireEvent.click(tabs[tabs.length - 1]);
        fireEvent.click(document.querySelector('.octane-trade-minimized__button.is-cancel'));

        expect(stopTrading).toHaveBeenCalledTimes(1);
    });
});

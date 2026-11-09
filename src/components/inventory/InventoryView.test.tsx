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
});

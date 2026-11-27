import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const placement = vi.hoisted(() => ({ attemptItemPlacement: vi.fn(() => true) }));

const chair = {
    name: 'Chair',
    description: '',
    type: 1,
    category: 1,
    items: [],
    isSellable: false,
    isWallItem: false,
    hasUnseenItems: false,
    stuffData: { isUnique: false, rarityLevel: -1, uniqueNumber: 0 },
    iconUrl: '',
    getLastItem: () => null,
    getUnlockedCount: () => 1,
    getTotalCount: () => 1
} as any;

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    attemptItemPlacement: placement.attemptItemPlacement,
    getGroupItemKey: () => 'chair',
    LocalizeText: (key: string) => key
}));
vi.mock('../../../../hooks', () => ({
    useInventoryFurni: () => ({ groupItems: [chair], isLoaded: true, selectedItem: chair, setSelectedItem: () => {}, activate: () => 1, deactivate: () => {} }),
    useInventoryUnseenTracker: () => ({ resetItems: () => {} }),
    usePlayTestRestricted: () => false,
    useMarketplaceConfiguration: () => ({ data: null })
}));
vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutRoomPreviewerView: ({ onPreviewClick }: { onPreviewClick?: () => void }) => <div data-testid="preview" onClick={onPreviewClick} />
}));
vi.mock('@layout/InfiniteGrid', () => ({ InfiniteGrid: () => <div className="grid" /> }));

import { InventoryFurnitureView } from './InventoryFurnitureView';

const roomSession = { isPrivateRoom: false } as any;

const renderView = () => render(<InventoryFurnitureView filteredGroupItems={[chair]} roomPreviewer={null} roomSession={roomSession} sectionGroupItems={[chair]} />);

beforeEach(() => placement.attemptItemPlacement.mockClear());

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('InventoryFurnitureView placement', () => {
    it('picks the furni up from the preview with a mouse press on desktop', () => {
        renderView();

        fireEvent.pointerDown(screen.getByTestId('preview').parentElement as HTMLElement, { button: 0 });

        expect(placement.attemptItemPlacement).toHaveBeenCalledWith(chair);
    });

    it('leaves the preview to look at on a phone and places through the button', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        renderView();

        const preview = screen.getByTestId('preview');

        fireEvent.pointerDown(preview.parentElement as HTMLElement, { button: 0 });
        fireEvent.click(preview);

        expect(placement.attemptItemPlacement).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'inventory.furni.placetoroom' }));

        expect(placement.attemptItemPlacement).toHaveBeenCalledWith(chair);
    });
});

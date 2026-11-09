import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    currentOffer: null as any,
    purchaseOptions: {} as any,
    rooms: [] as string[][],
    windows: 0,
    previewer: null as any
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    GetSessionDataManager: () => ({ getWallItemDataByName: () => ({ id: 77, customParams: '' }) })
}));

vi.mock('../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../hooks')>()),
    useCatalogData: () => ({ currentOffer: state.currentOffer, roomPreviewer: state.previewer }),
    useCatalogUiState: () => ({
        setCurrentOffer: (offer: any) => {
            state.currentOffer = offer;
        },
        setPurchaseOptions: (update: (previous: any) => any) => {
            state.purchaseOptions = update(state.purchaseOptions);
        }
    }),
    useInventoryFurni: () => ({ isVisible: false })
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    LocalizeText: (key: string) => key
}));

vi.mock('../../../../../common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../common')>()),
    LayoutRoomPreviewerView: () => <div data-testid="preview" />
}));

vi.mock('../common/CatalogGridOfferView', () => ({
    CatalogGridOfferView: (props: { offer: any; selectOffer: (offer: any) => void }) => (
        <button type="button" onClick={() => props.selectOffer(props.offer)}>
            {props.offer.localizationName}
        </button>
    )
}));
vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({ CatalogPurchaseWidgetView: () => null }));
vi.mock('../widgets/CatalogTotalPriceWidget', () => ({ CatalogTotalPriceWidget: () => null }));

import { CatalogLayoutSpacesView } from './CatalogLayoutSpacesView';

const offer = (offerId: number, className: string, extraParam: string) => ({
    offerId,
    localizationName: `${className} ${extraParam}`,
    pricingModel: 'pricing_model_single',
    product: { productType: 'i', extraParam, furnitureData: { className } }
});

const page = {
    offers: [offer(1, 'floor', '101'), offer(2, 'floor', '102'), offer(3, 'wallpaper', '201'), offer(4, 'landscape', '1.1')],
    localization: { getText: () => '', getImage: () => null }
} as any;

describe('spaces page (AIR layout_spaces_new_xml)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.currentOffer = null;
        state.purchaseOptions = {};
        state.rooms = [];
        state.windows = 0;
        state.previewer = {
            addViewOffset: { y: 0 },
            centerWallItems: false,
            setAutomaticStateChange: vi.fn(),
            reset: vi.fn(),
            updateRoomWallsAndFloorVisibility: vi.fn(),
            updateObjectRoom: (floor: string, wall: string, view: string) => state.rooms.push([floor, wall, view]),
            addWallItemIntoRoom: () => state.windows++,
            updatePreviewObjectBoundingRectangle: vi.fn()
        };
    });

    it('starts on walls, previews the three choices together and keeps a choice per tab', () => {
        render(<CatalogLayoutSpacesView page={page} hideNavigation={() => undefined} />);

        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
            'catalog.spaces.tab.walls',
            'catalog.spaces.tab.floors',
            'catalog.spaces.tab.views'
        ]);
        expect(screen.getByRole('tab', { name: 'catalog.spaces.tab.walls' })).toHaveAttribute('aria-selected', 'true');
        expect(state.currentOffer.offerId).toBe(3);
        expect(state.purchaseOptions).toMatchObject({ extraData: '201', extraParamRequired: true });
        expect(state.rooms.at(-1)).toEqual(['101', '201', '1.1']);
        expect(state.windows).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('tab', { name: 'catalog.spaces.tab.floors' }));
        fireEvent.click(screen.getByText('floor 102'));

        expect(state.currentOffer.offerId).toBe(2);
        expect(state.rooms.at(-1)).toEqual(['102', '201', '1.1']);

        fireEvent.click(screen.getByRole('tab', { name: 'catalog.spaces.tab.walls' }));
        expect(state.currentOffer.offerId).toBe(3);
    });
});

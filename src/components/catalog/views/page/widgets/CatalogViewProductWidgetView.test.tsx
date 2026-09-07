import { GetAvatarRenderManager, GetSessionDataManager } from '@octane/renderer';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { CatalogViewProductWidgetView } from './CatalogViewProductWidgetView';

vi.mock('../../../../../api', () => ({
    FurniCategory: {
        FLOOR: 3,
        WALL_PAPER: 2,
        LANDSCAPE: 4,
        FIGURE_PURCHASABLE_SET: 23
    },
    Offer: { PRICING_MODEL_BUNDLE: 'bundle' },
    ProductTypeEnum: {
        FLOOR: 's',
        WALL: 'i',
        ROBOT: 'r',
        EFFECT: 'e'
    }
}));

vi.mock('../../../../../common', () => ({
    AutoGrid: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Column: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    LayoutGridItem: () => <div />,
    LayoutRoomPreviewerView: () => <div data-testid="product-preview" />
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogData: vi.fn(),
    useCatalogUiState: vi.fn()
}));

const createRoomPreviewer = () => ({
    addViewOffset: { x: 0, y: 0 },
    addAvatarIntoRoom: vi.fn(function (this: { setAutomaticStateChange: (enabled: boolean) => void }) {
        this.setAutomaticStateChange(true);
    }),
    addFurnitureIntoRoom: vi.fn(function (this: { setAutomaticStateChange: (enabled: boolean) => void }) {
        this.setAutomaticStateChange(true);
    }),
    addWallItemIntoRoom: vi.fn(function (this: { setAutomaticStateChange: (enabled: boolean) => void }) {
        this.setAutomaticStateChange(true);
    }),
    centerWallItems: false,
    reset: vi.fn(),
    setAutomaticStateChange: vi.fn(),
    updateObjectRoom: vi.fn(),
    updateRoomWallsAndFloorVisibility: vi.fn(),
    zoomIn: vi.fn()
});

const createFloorOffer = (specialType: number) => ({
    pricingModel: 'single',
    product: {
        productType: 's',
        productClassId: 500,
        extraParam: '',
        furnitureData: { id: 500, specialType }
    }
});

const createLandscapeOffer = () => ({
    pricingModel: 'single',
    product: {
        productType: 'i',
        productClassId: 600,
        extraParam: 'landscape',
        furnitureData: { id: 600, specialType: 4 }
    }
});

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogUiState).mockReturnValue({ purchaseOptions: { previewStuffData: null } } as any);
});

describe('catalog product preview', () => {
    it('composes purchasable clothing with the current gender and no avatar effect', async () => {
        const roomPreviewer = createRoomPreviewer();
        const avatarRenderManager = {
            getFigureStringWithFigureIds: vi.fn(() => 'composed-figure'),
            isValidFigureSetForGender: vi.fn((setId: number) => setId === 101 || setId === 202)
        };

        vi.mocked(GetAvatarRenderManager).mockReturnValue(avatarRenderManager as any);
        vi.mocked(GetSessionDataManager).mockReturnValue({
            figure: 'base-figure',
            gender: 'M',
            getFloorItemData: () => ({ customParams: '101, invalid, 202' })
        } as any);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer: createFloorOffer(23), roomPreviewer } as any);

        render(<CatalogViewProductWidgetView />);

        await waitFor(() => {
            expect(roomPreviewer.reset).not.toHaveBeenCalled();
            expect(avatarRenderManager.isValidFigureSetForGender).toHaveBeenCalledWith(101, 'M');
            expect(avatarRenderManager.isValidFigureSetForGender).toHaveBeenCalledWith(202, 'M');
            expect(avatarRenderManager.getFigureStringWithFigureIds).toHaveBeenCalledWith('base-figure', 'M', [101, 202]);
            expect(roomPreviewer.addAvatarIntoRoom).toHaveBeenCalledWith('composed-figure', 0);
            expect(roomPreviewer.zoomIn).toHaveBeenCalledOnce();
            // 41px on a canvas the same step has already doubled: half that in engine pixels.
            expect(roomPreviewer.addViewOffset.y).toBe(-21);
            expect(roomPreviewer.setAutomaticStateChange).toHaveBeenLastCalledWith(false);
        });
    });

    it('keeps normal furniture in the furniture preview even when its parameters match a figure set', async () => {
        const roomPreviewer = createRoomPreviewer();
        const avatarRenderManager = {
            getFigureStringWithFigureIds: vi.fn(),
            isValidFigureSetForGender: vi.fn(() => true),
            structureData: { getFigurePartSet: vi.fn(() => ({ id: 101 })) }
        };

        vi.mocked(GetAvatarRenderManager).mockReturnValue(avatarRenderManager as any);
        vi.mocked(GetSessionDataManager).mockReturnValue({
            figure: 'base-figure',
            gender: 'M',
            getFloorItemData: () => ({ customParams: '101' })
        } as any);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer: createFloorOffer(1), roomPreviewer } as any);

        render(<CatalogViewProductWidgetView />);

        await waitFor(() => {
            expect(roomPreviewer.reset).toHaveBeenCalledWith(true);
            expect(roomPreviewer.addFurnitureIntoRoom).toHaveBeenCalledWith(500, expect.anything(), null, '');
            expect(roomPreviewer.addAvatarIntoRoom).not.toHaveBeenCalled();
            expect(roomPreviewer.zoomIn).not.toHaveBeenCalled();
            // Furniture is not zoomed, but it is lifted: the canvas is centred in a box shorter
            // than itself, so dead centre reads low for everything in it, not just avatars.
            expect(roomPreviewer.addViewOffset.y).toBe(-21);
            expect(roomPreviewer.centerWallItems).toBe(true);
            expect(roomPreviewer.updateObjectRoom).not.toHaveBeenCalled();
            expect(roomPreviewer.setAutomaticStateChange).toHaveBeenLastCalledWith(true);
        });
    });

    it('keeps the base avatar usable when clothing metadata is missing or malformed', async () => {
        const roomPreviewer = createRoomPreviewer();
        const avatarRenderManager = {
            getFigureStringWithFigureIds: vi.fn(() => ''),
            isValidFigureSetForGender: vi.fn()
        };
        const offer = createFloorOffer(23);

        offer.product.furnitureData = { ...offer.product.furnitureData, customParams: '101broken, 0x65, 1e2, 0, -2' } as any;
        vi.mocked(GetAvatarRenderManager).mockReturnValue(avatarRenderManager as any);
        vi.mocked(GetSessionDataManager).mockReturnValue({
            figure: 'base-figure',
            gender: 'F',
            getFloorItemData: () => null
        } as any);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer: offer, roomPreviewer } as any);

        render(<CatalogViewProductWidgetView />);

        await waitFor(() => {
            expect(avatarRenderManager.getFigureStringWithFigureIds).toHaveBeenCalledWith('base-figure', 'F', []);
            expect(avatarRenderManager.isValidFigureSetForGender).not.toHaveBeenCalled();
            expect(roomPreviewer.addAvatarIntoRoom).toHaveBeenCalledWith('base-figure', 0);
            expect(roomPreviewer.setAutomaticStateChange).toHaveBeenLastCalledWith(false);
        });
    });

    /**
     * The previewer is shared with every other catalog layout, and the offset is a live Point on
     * it: an outfit's lift left behind is inherited by the next furniture drawn in the same box.
     */
    it('hands the previewer back unlifted when it stops driving it', async () => {
        const roomPreviewer = createRoomPreviewer();

        vi.mocked(GetAvatarRenderManager).mockReturnValue({
            getFigureStringWithFigureIds: vi.fn(() => 'composed-figure'),
            isValidFigureSetForGender: vi.fn(() => true)
        } as any);
        vi.mocked(GetSessionDataManager).mockReturnValue({
            figure: 'base-figure',
            gender: 'M',
            getFloorItemData: () => ({ customParams: '101' })
        } as any);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer: createFloorOffer(23), roomPreviewer } as any);

        const view = render(<CatalogViewProductWidgetView />);

        await waitFor(() => expect(roomPreviewer.addViewOffset.y).toBe(-21));

        view.unmount();

        expect(roomPreviewer.addViewOffset.y).toBe(0);
    });

    it('keeps landscape previews static after the wall object is loaded', async () => {
        const roomPreviewer = createRoomPreviewer();

        vi.mocked(GetSessionDataManager).mockReturnValue({
            getWallItemDataByName: () => ({ id: 600 })
        } as any);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer: createLandscapeOffer(), roomPreviewer } as any);

        render(<CatalogViewProductWidgetView />);

        await waitFor(() => {
            expect(roomPreviewer.addWallItemIntoRoom).toHaveBeenCalledWith(600, expect.anything(), undefined);
            expect(roomPreviewer.setAutomaticStateChange).toHaveBeenLastCalledWith(false);
        });
    });
});

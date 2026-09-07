import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogLayoutSoundMachineView } from './CatalogLayoutSoundMachineView';

const sound = vi.hoisted(() => {
    const songInfo = { length: 61000 };
    const currentOffer = {
        localizationDescription: 'Sound description',
        localizationName: 'Sound title',
        product: { extraParam: '12', productClassId: 1, productType: 's' }
    };
    const musicController = {
        getSongInfo: vi.fn((id: number) => {
            if (id === 12) return songInfo;
            return null;
        }),
        playSong: vi.fn(),
        requestSongInfoWithoutSamples: vi.fn(),
        stop: vi.fn()
    };

    return { currentOffer, musicController };
});

vi.mock('@octane/renderer', () => ({
    GetOfficialSongIdMessageComposer: class {},
    GetSoundManager: () => ({ musicController: sound.musicController }),
    MusicPriorities: { PRIORITY_PURCHASE_PREVIEW: 3 },
    OfficialSongIdMessageEvent: class {},
    SongInfoReceivedEvent: { SIR_TRAX_SONG_INFO_RECEIVED: 'song-info' }
}));

vi.mock('../../../../../api', () => ({
    LocalizeText: (key: string, _keys?: string[], values?: string[]) => (key === 'catalog.song.length' ? `${values?.[0]}:${values?.[1]}` : key),
    SendMessageComposer: vi.fn()
}));

vi.mock('../../../../../common', () => ({ LayoutFurniImageView: () => <div data-testid="furni-image" /> }));

vi.mock('../../../../../hooks', () => ({
    getCatalogGridMetrics: () => ({ columnCount: 6, columnMinHeight: 70, columnMinWidth: 53 }),
    useCatalogData: () => ({ currentOffer: sound.currentOffer }),
    useCatalogDisplayPreferences: () => ({ density: 'standard', showTilePrices: true }),
    useMessageEvent: vi.fn(),
    useOctaneEvent: vi.fn()
}));

vi.mock('../../../../../layout', () => ({ OctaneButton: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('../widgets/CatalogItemGridWidgetView', () => ({ CatalogItemGridWidgetView: () => <div /> }));
vi.mock('../widgets/CatalogPriceDisplayWidgetView', () => ({ CatalogPriceDisplayWidgetView: () => <div /> }));
vi.mock('../widgets/CatalogPurchaseSelectionPrompt', () => ({ CatalogPurchaseSelectionPrompt: () => <div /> }));
vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({ CatalogPurchaseWidgetView: () => <div /> }));

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('CatalogLayoutSoundMachineView AIR6 playback', () => {
    it('starts and cleans up the purchase preview through the renderer music controller', async () => {
        const view = render(<CatalogLayoutSoundMachineView page={{} as any} hideNavigation={() => undefined} />);

        const listenButton = await screen.findByRole('button', { name: 'play_preview_button' });

        await waitFor(() => expect(listenButton).toBeEnabled());
        fireEvent.click(listenButton);

        expect(sound.musicController.playSong).toHaveBeenCalledWith(12, 3, 15, 40, 0.5, 2);

        view.unmount();

        expect(sound.musicController.stop).toHaveBeenCalledWith(3);
    });
});

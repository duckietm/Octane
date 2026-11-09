import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ sent: [] as unknown[], handlers: new Map<unknown, (event: unknown) => void>() }));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    LocalizeText: (key: string) => key,
    SendMessageComposer: (composer: unknown) => state.sent.push(composer)
}));

vi.mock('../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../hooks')>()),
    useCatalogUiState: () => ({ setIsVisible: vi.fn() }),
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler),
    useNavigatorData: () => ({ categories: [{ id: 1, name: 'cat.one', visible: true }] }),
    useRoomPromote: () => ({ promoteInformation: null, isExtended: false, setIsExtended: vi.fn() })
}));

vi.mock('../widgets/CatalogPriceDisplayWidgetView', () => ({
    CatalogPriceDisplayWidgetView: (props: { offer: { priceInCredits: number } }) => <span>{props.offer.priceInCredits} credits</span>
}));

import { PurchaseRoomAdMessageComposer, RoomAdPurchaseInfoEvent } from '@octane/renderer';
import { selectOption } from '../../../../../test-utils/selectOption';
import { CatalogLayoutRoomAdsView } from './CatalogLayoutRoomAdsView';

const page = { pageId: 12, offers: [{ offerId: 34, priceInCredits: 5 }], localization: { getText: () => '', getImage: () => null } } as any;

describe('room ads page (AIR layout_roomads_xml)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.sent.length = 0;
        state.handlers.clear();
    });

    it('shows the price and buys the ad with the filled-in fields', () => {
        render(<CatalogLayoutRoomAdsView page={page} hideNavigation={() => undefined} />);

        act(() => state.handlers.get(RoomAdPurchaseInfoEvent)?.({ getParser: () => ({ rooms: [{ roomId: 99, roomName: 'My room' }] }) }));

        expect(screen.getByText('5 credits')).toBeInTheDocument();

        const buy = screen.getByRole('button', { name: 'buy' });

        expect(buy).toBeDisabled();

        fireEvent.change(screen.getByLabelText('roomad.catalog_name'), { target: { value: 'Party' } });
        fireEvent.change(screen.getByLabelText('roomad.catalog_description'), { target: { value: 'Come along' } });
        selectOption(screen.getByRole('combobox', { name: 'roomad.catalog_roomname' }), 'My room');
        fireEvent.click(screen.getByRole('button', { name: 'buy' }));

        const purchase = state.sent.find((composer) => composer instanceof PurchaseRoomAdMessageComposer) as any;

        expect(purchase?.getMessageArray()).toEqual([12, 34, 99, 'Party', false, 'Come along', 1]);
    });
});

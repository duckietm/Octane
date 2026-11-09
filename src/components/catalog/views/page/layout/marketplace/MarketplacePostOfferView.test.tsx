/* @vitest-environment jsdom */

import { GetSessionDataManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    showConfirm: vi.fn(),
    simpleAlert: vi.fn(),
    uiHandler: null as (event: any) => void,
    messageHandler: null as (event: any) => void,
    balanceHandler: null as (event: any) => void,
    openUrl: vi.fn(),
    stats: null as any,
    statsArgs: [] as number[][],
    nftStatsArgs: [] as string[],
    configuration: null as any
}));

vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@octane/renderer')>();
    const composer = (name: string) =>
        class {
            public readonly name = name;
            public readonly args: unknown[];
            constructor(...args: unknown[]) {
                this.args = args;
            }
        };

    return {
        ...actual,
        GetMarketplaceCanMakeOfferComposer: composer('canMakeOffer'),
        MakeOfferMessageComposer: composer('makeOffer'),
        MakeNftMarketplaceOfferComposer: composer('makeNftOffer'),
        MakeMultipleOffersMessageComposer: composer('makeMultipleOffers'),
        BuyMarketplaceTokensMessageComposer: composer('buyTokens'),
        MarketplaceCanMakeOfferResult: class MarketplaceCanMakeOfferResult {},
        NotEnoughBalanceMessageEvent: class NotEnoughBalanceMessageEvent {}
    };
});

vi.mock('../../../../../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../../../api')>();

    return {
        ...actual,
        LocalizeText: (key: string) => key,
        GetConfigurationValue: (key: string, fallback: unknown) => (key === 'web.shop.relativeUrl' ? '/shop' : fallback),
        OpenUrl: mocks.openUrl,
        SendMessageComposer: mocks.send
    };
});

vi.mock('../../../../../../common', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../../../common')>();

    return {
        ...actual,
        LayoutFurniImageView: () => <div data-testid="furni-image" />,
        OctaneCardView: ({ children }: PropsWithChildren) => <div>{children}</div>,
        OctaneCardHeaderView: ({ headerText, onCloseClick }: { headerText: string; onCloseClick: () => void }) => (
            <div>
                <span>{headerText}</span>
                <button type="button" onClick={onCloseClick}>
                    close
                </button>
            </div>
        ),
        OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>
    };
});

vi.mock('../../../../../../hooks', () => ({
    useMarketplaceConfiguration: () => ({
        data: mocks.configuration ?? { minimumPrice: 5, maximumPrice: 1000, offerTime: 48, displayTime: 7, commission: 1, credits: 1, advertisements: 5 }
    }),
    useMarketplaceItemStats: (category: number, furniId: number) => {
        mocks.statsArgs.push([category, furniId]);

        return category ? mocks.stats : null;
    },
    useNftMarketplaceItemStats: (productCode: string) => {
        mocks.nftStatsArgs.push(productCode);

        return productCode ? mocks.stats : null;
    },
    useMessageEvent: (type: { name?: string }, handler: (event: any) => void) => {
        if (type?.name === 'NotEnoughBalanceMessageEvent') mocks.balanceHandler = handler;
        else mocks.messageHandler = handler;
    },
    useUiEvent: (_type: unknown, handler: (event: any) => void) => {
        mocks.uiHandler = handler;
    },
    useNotification: () => ({ showConfirm: mocks.showConfirm, simpleAlert: mocks.simpleAlert })
}));

import { MarketplacePostOfferView } from './MarketplacePostOfferView';

const furni = (id: number, type = 2270) =>
    ({
        id,
        type,
        isWallItem: false,
        category: 1,
        extra: 0,
        stuffData: { uniqueNumber: 0, uniqueSeries: 0, rarityLevel: -1, getLegacyString: () => '' }
    }) as any;

const open = (items = [furni(11)]) => {
    act(() => mocks.uiHandler({ item: items[0], items }));
    act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 1 }) }));
};

describe('MarketplacePostOfferView', () => {
    beforeEach(() => {
        mocks.send.mockClear();
        mocks.showConfirm.mockClear();
        mocks.simpleAlert.mockClear();
        mocks.openUrl.mockClear();
        mocks.stats = null;
        mocks.statsArgs.length = 0;
        mocks.nftStatsArgs.length = 0;
        mocks.configuration = null;
        vi.mocked(GetSessionDataManager).mockReturnValue({
            getFloorItemData: (id: number) =>
                id === 2270 ? { name: 'Troon', className: 'throne' } : id === 9002 ? { name: 'Bunny', className: 'nft_bunny' } : null,
            getWallItemData: () => null
        } as any);
    });

    afterEach(() => {
        cleanup();
        vi.mocked(GetSessionDataManager).mockReset();
    });

    it('offers a collectible for emeralds in its own window while the Collectibles marketplace is on', () => {
        mocks.configuration = {
            minimumPrice: 5,
            maximumPrice: 1000,
            offerTime: 48,
            displayTime: 7,
            nftEnabled: true,
            nftMinimumPrice: 10,
            nftMaximumPrice: 500,
            nftOfferMinutes: 10080,
            nftSellingFeePercentage: 5,
            nftHalfTaxLimit: 2147483647
        };
        render(<MarketplacePostOfferView />);

        act(() => mocks.uiHandler({ item: furni(21, 9002), items: [furni(21, 9002), furni(22, 9002)] }));

        // AIR startNftOfferMaking: no can-make-offer check, no amount line, prices in emeralds.
        expect(mocks.send).not.toHaveBeenCalled();
        expect(screen.getByTestId('marketplace-post-offer-name').textContent).toBe('Bunny');
        expect(mocks.nftStatsArgs.at(-1)).toBe('nft_bunny');
        expect(screen.queryByLabelText(/Amount/)).toBeNull();
        expect(screen.getByText('Your offer will be visible to other users for 7 day(s).')).toBeTruthy();
        expect(screen.getByTestId('marketplace-post-offer-final').textContent).toBe('You can make offers between 10 and 500 Emeralds.');

        fireEvent.change(screen.getByLabelText('Asking price:'), { target: { value: '100' } });
        expect(screen.getByTestId('marketplace-post-offer-final').textContent).toBe('Expected revenue per item: 95');

        fireEvent.click(screen.getByRole('button', { name: 'Post offer' }));
        expect(mocks.showConfirm.mock.calls[0][0]).toBe('You are selling Bunny. If someone buys this offer, you will receive: 95 Emerald(s).');

        // The confirm holds the one-post-at-a-time guard for five seconds; let it go so later tests can post.
        vi.useFakeTimers();
        try {
            act(() => mocks.showConfirm.mock.calls[0][1]());
            vi.advanceTimersByTime(5000);
        } finally {
            vi.useRealTimers();
        }
        const sent = mocks.send.mock.calls.at(-1)[0];
        expect(sent.name).toBe('makeNftOffer');
        expect(sent.args).toEqual([1, 21, 100]);
    });

    it('sells a collectible as furni while the Collectibles marketplace is off', () => {
        mocks.configuration = { minimumPrice: 5, maximumPrice: 1000, offerTime: 48, displayTime: 7, nftEnabled: false };
        render(<MarketplacePostOfferView />);

        act(() => mocks.uiHandler({ item: furni(21, 9002), items: [furni(21, 9002)] }));

        expect(mocks.send.mock.calls[0][0].name).toBe('canMakeOffer');
    });

    it('asks whether selling is allowed, then opens with the furnidata name and the stats request', () => {
        render(<MarketplacePostOfferView />);

        act(() => mocks.uiHandler({ item: furni(11), items: [furni(11)] }));
        expect(mocks.send.mock.calls[0][0].name).toBe('canMakeOffer');
        expect(screen.queryByTestId('marketplace-post-offer-name')).toBeNull();

        act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 1 }) }));

        expect(screen.getByTestId('marketplace-post-offer-name').textContent).toBe('Troon');
        expect(mocks.statsArgs.at(-1)).toEqual([1, 2270]);
        expect(screen.getByText('Your offer will be visible to other users for 2 day(s).')).toBeTruthy();
    });

    it('keeps Post disabled below the minimum and shows the revenue from the minimum up', () => {
        render(<MarketplacePostOfferView />);
        open();

        const post = screen.getByRole('button', { name: 'Post offer' });
        const final = screen.getByTestId('marketplace-post-offer-final');

        expect(post).toHaveProperty('disabled', true);
        expect(final.textContent).toBe('You can offer items for between 5 and 1000 credits.');

        fireEvent.change(screen.getByLabelText('Asking price:'), { target: { value: '4' } });
        expect(post).toHaveProperty('disabled', true);

        fireEvent.change(screen.getByLabelText('Asking price:'), { target: { value: '25x' } });
        expect(post).toHaveProperty('disabled', false);
        expect(final.textContent).toBe('Expected revenue per item: 25');

        fireEvent.change(screen.getByLabelText('Asking price:'), { target: { value: '5000' } });
        expect((screen.getByLabelText('Asking price:') as HTMLInputElement).value).toBe('1000');
    });

    it('shows only the stat lines above zero and copies the suggested price', () => {
        mocks.stats = { averagePrice: 101, lowestCurrentPrice: 0, suggestedPrice: 100 };
        render(<MarketplacePostOfferView />);
        open();

        expect(screen.getByTestId('marketplace-post-offer-average').textContent).toBe('Average price (7 days): 101');
        expect(screen.queryByTestId('marketplace-post-offer-lowest')).toBeNull();
        expect(screen.getByTestId('marketplace-post-offer-suggested').textContent).toBe('Suggested price: 100');

        fireEvent.click(screen.getByRole('button', { name: 'Copy suggested price' }));
        expect((screen.getByLabelText('Asking price:') as HTMLInputElement).value).toBe('100');
    });

    it('hides the copy button once the stats carry no suggestion', () => {
        mocks.stats = { averagePrice: 0, lowestCurrentPrice: 0, suggestedPrice: 0 };
        render(<MarketplacePostOfferView />);
        open();

        expect(screen.queryByRole('button', { name: 'Copy suggested price' })).toBeNull();
    });

    it('closes into the confirmation and sends one multi-offer for the chosen amount', () => {
        render(<MarketplacePostOfferView />);
        open([furni(11), furni(12), furni(13)]);

        fireEvent.change(screen.getByLabelText('Asking price:'), { target: { value: '30' } });
        fireEvent.change(screen.getByLabelText('Amount (max 3)'), { target: { value: '9' } });
        expect((screen.getByLabelText('Amount (max 3)') as HTMLInputElement).value).toBe('3');

        fireEvent.click(screen.getByRole('button', { name: 'Post offer' }));

        expect(screen.queryByTestId('marketplace-post-offer-name')).toBeNull();
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
        expect(mocks.showConfirm.mock.calls[0][0]).toBe('You are about to sell 3 x Troon for 30 credit(s) each. When all are sold you will earn 90 credit(s).');

        mocks.send.mockClear();
        act(() => mocks.showConfirm.mock.calls[0][1]());

        const sent = mocks.send.mock.calls[0][0];

        expect(sent.name).toBe('makeMultipleOffers');
        expect(sent.args).toEqual([30, 1, [11, 12, 13]]);
    });

    it('Cancel closes without a confirmation', () => {
        render(<MarketplacePostOfferView />);
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByTestId('marketplace-post-offer-name')).toBeNull();
        expect(mocks.showConfirm).not.toHaveBeenCalled();
    });
    it('offers the token batch when no selling tokens are left and opens the offer once they are bought', () => {
        render(<MarketplacePostOfferView />);

        act(() => mocks.uiHandler({ item: furni(11), items: [furni(11)] }));
        act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 4, tokenCount: 0 }) }));

        expect(screen.queryByTestId('marketplace-post-offer-name')).toBeNull();
        expect(screen.getByTestId('marketplace-buy-tokens-info').textContent).toBe(
            'Selling furni on the marketplace costs 1 credit for 5 advertisements. You have none left, so your next advertisement costs 1 credit. The 4 after it are free.'
        );

        fireEvent.click(screen.getByRole('button', { name: 'Buy (1 credit)' }));

        expect(mocks.send.mock.calls.at(-1)[0].name).toBe('buyTokens');
        expect(screen.queryByTestId('marketplace-buy-tokens-info')).toBeNull();

        act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 1, tokenCount: 5 }) }));

        expect(screen.getByTestId('marketplace-post-offer-name').textContent).toBe('Troon');
    });

    it('shows the no-credits window when the token purchase is refused and links to the shop', () => {
        render(<MarketplacePostOfferView />);

        act(() => mocks.uiHandler({ item: furni(11), items: [furni(11)] }));
        act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 4, tokenCount: 0 }) }));
        fireEvent.click(screen.getByRole('button', { name: 'Buy (1 credit)' }));
        act(() => mocks.balanceHandler({ getParser: () => ({ notEnoughCredits: true, notEnoughActivityPoints: false }) }));

        expect(screen.getByTestId('marketplace-no-credits-info').textContent).toBe('You need 1 credit for five advertisements.');

        fireEvent.click(screen.getByRole('button', { name: 'Get credits' }));

        expect(mocks.openUrl).toHaveBeenCalledWith('/shop');
        expect(screen.queryByTestId('marketplace-no-credits-info')).toBeNull();

        // The items were released: a late answer opens nothing.
        act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 1, tokenCount: 5 }) }));
        expect(screen.queryByTestId('marketplace-post-offer-name')).toBeNull();
    });

    it('keeps the items while the user reads the buy-tokens window', () => {
        vi.useFakeTimers();

        try {
            render(<MarketplacePostOfferView />);

            act(() => mocks.uiHandler({ item: furni(11), items: [furni(11)] }));
            act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 4, tokenCount: 0 }) }));
            act(() => vi.advanceTimersByTime(3000));
            fireEvent.click(screen.getByRole('button', { name: 'Buy (1 credit)' }));
            // The timer of the first check must not release the items of the purchase.
            act(() => vi.advanceTimersByTime(4000));
            act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 1, tokenCount: 5 }) }));

            expect(screen.getByTestId('marketplace-post-offer-name').textContent).toBe('Troon');
        } finally {
            vi.useRealTimers();
        }
    });

    it('ignores a balance refusal that is not about the token purchase', () => {
        render(<MarketplacePostOfferView />);

        act(() => mocks.balanceHandler({ getParser: () => ({ notEnoughCredits: true }) }));

        expect(screen.queryByTestId('marketplace-no-credits-info')).toBeNull();
    });

    it('cancelling the buy-tokens window releases the items', () => {
        render(<MarketplacePostOfferView />);

        act(() => mocks.uiHandler({ item: furni(11), items: [furni(11)] }));
        act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 4, tokenCount: 0 }) }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByTestId('marketplace-buy-tokens-info')).toBeNull();
        act(() => mocks.messageHandler({ getParser: () => ({ resultCode: 1, tokenCount: 5 }) }));
        expect(screen.queryByTestId('marketplace-post-offer-name')).toBeNull();
        expect(mocks.send.mock.calls.map((call) => call[0].name)).toEqual(['canMakeOffer']);
    });
});

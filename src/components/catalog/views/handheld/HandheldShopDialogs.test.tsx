/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';
import { HandheldSpecialItemsDisplayView } from '../../special-items/HandheldSpecialItemsDisplayView';
import { CatalogPurchaseConfirmView } from '../CatalogPurchaseConfirmView';
import { HandheldCatalogGiftView, HandheldCatalogGiftViewProps } from '../gift/HandheldCatalogGiftView';
import { CatalogClubPurchaseConfirmView } from '../page/layout/CatalogClubPurchaseConfirmView';
import { MarketplaceBuyTokensView, MarketplaceNoCreditsView } from '../page/layout/marketplace/MarketplaceTokenDialogsView';
import { HandheldMarketplacePostOfferView, HandheldOfferWindowView } from './HandheldShopSheetViews';

const config: Record<string, unknown> = {};

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        GetConfigurationValue: (key: string, fallback: unknown) => (key in config ? config[key] : fallback),
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string, params: string[] = [], values: string[] = []) =>
            (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback)
    };
});
vi.mock('../../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

// The window itself is DraggableWindow's business (and tested there); here it is a plain box that says whether it is a sheet.
vi.mock('../../../../common/draggable-window', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    DraggableWindow: ({ children, handheldSheet, uniqueKey }: { children: React.ReactNode; handheldSheet?: boolean; uniqueKey?: string }) => (
        <div data-key={uniqueKey} data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

const goHandheld = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

const offer = {
    localizationName: 'Golden chair',
    priceInCredits: 25,
    priceInActivityPoints: 5,
    activityPointType: 5,
    isRentOffer: false,
    offerId: 42,
    product: { getIconUrl: () => '/catalog/chair.png' }
} as never;

beforeEach(() => {
    for (const key of Object.keys(config)) delete config[key];
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('shop dialogs on a phone', () => {
    it('keeps the desktop purchase confirmation when not on a phone', () => {
        render(<CatalogPurchaseConfirmView offer={offer} quantity={1} onCancel={() => undefined} onConfirm={() => undefined} />);

        expect(document.querySelector('.octane-catalog-purchase-confirm')).not.toBeNull();
        expect(screen.queryByTestId('handheld-purchase')).toBeNull();
        expect(screen.queryByTestId('handheld-purchase-scrim')).toBeNull();
    });

    it('confirms a purchase from a card over the shop, with the picture, amount and price', () => {
        goHandheld();

        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        render(<CatalogPurchaseConfirmView offer={offer} quantity={2} onCancel={onCancel} onConfirm={onConfirm} />);

        const card = screen.getByTestId('handheld-purchase');

        expect(card).toHaveAttribute('role', 'dialog');
        expect(card).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByTestId('window')).toHaveAttribute('data-sheet', 'true');
        expect(document.querySelector('.octane-catalog-purchase-confirm')).toBeNull();
        expect(screen.getByRole('img', { name: 'Golden chair' })).toHaveAttribute('src', '/catalog/chair.png');
        expect(screen.getByText('X 2')).toBeInTheDocument();
        expect(screen.getByTestId('handheld-shop-price')).toHaveTextContent('50+ 10');

        fireEvent.click(screen.getByTestId('handheld-purchase-confirm'));
        expect(onConfirm).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByTestId('handheld-purchase-cancel'));
        fireEvent.click(screen.getByTestId('handheld-purchase-scrim'));
        expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it('names a gift purchase and holds the card while the purchase is under way', () => {
        goHandheld();

        const onCancel = vi.fn();

        render(<CatalogPurchaseConfirmView isGift isSubmitting offer={offer} quantity={1} onCancel={onCancel} onConfirm={() => undefined} />);

        expect(screen.getByTestId('handheld-purchase-confirm')).toHaveTextContent('catalog.purchase_confirmation.gift');
        expect(screen.getByTestId('handheld-purchase-confirm')).toBeDisabled();
        expect(screen.getByTestId('handheld-purchase-cancel')).toBeDisabled();

        fireEvent.click(screen.getByTestId('handheld-purchase-scrim'));
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('asks for the credit-spending disclaimer before buying, as on the desktop', () => {
        config['disclaimer.credit_spending.enabled'] = true;
        goHandheld();

        const onConfirm = vi.fn();

        render(<CatalogPurchaseConfirmView offer={offer} quantity={1} onCancel={() => undefined} onConfirm={onConfirm} />);

        expect(screen.getByTestId('handheld-purchase-confirm')).toBeDisabled();
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByTestId('handheld-purchase-confirm'));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('subscribes to the club from a card', () => {
        goHandheld();

        const onConfirm = vi.fn();

        render(
            <CatalogClubPurchaseConfirmView
                offer={{ offerId: 3, priceCredits: 25, priceActivityPoints: 0, priceActivityPointsType: 0 } as never}
                productText="HC 1 month"
                validUntilText="Until 28 December"
                onCancel={() => undefined}
                onConfirm={onConfirm}
            />
        );

        expect(screen.getByTestId('handheld-club-purchase')).toHaveTextContent('HC 1 month');
        expect(screen.getByTestId('handheld-shop-price')).toHaveTextContent('25');
        fireEvent.click(screen.getByTestId('handheld-club-confirm'));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('buys marketplace tokens or goes for credits from the same cards', () => {
        goHandheld();

        const onBuy = vi.fn();
        const onGetCredits = vi.fn();
        const onClose = vi.fn();

        render(<MarketplaceBuyTokensView count={5} price={1} onBuy={onBuy} onCancel={() => undefined} />);
        expect(screen.getByTestId('handheld-marketplace-buy-tokens')).toHaveTextContent('The 4 after it are free.');
        fireEvent.click(screen.getByTestId('handheld-marketplace-token-confirm'));
        expect(onBuy).toHaveBeenCalledOnce();
        cleanup();

        render(<MarketplaceNoCreditsView price={1} onClose={onClose} onGetCredits={onGetCredits} />);
        fireEvent.click(screen.getByTestId('handheld-marketplace-token-confirm'));
        fireEvent.click(screen.getByTestId('handheld-marketplace-token-cancel'));
        expect(onGetCredits).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });
});

describe('the gift wrapping on a phone', () => {
    const giftProps = (): HandheldCatalogGiftViewProps => ({
        title: 'Gift wrapping',
        recipient: {
            placeholder: 'Name',
            value: 'An',
            inputRef: createRef(),
            suggestions: ['Anna', 'Andy'],
            renderName: (name) => name,
            onChange: vi.fn(),
            onFocus: vi.fn(),
            onPick: vi.fn(),
            onDismiss: vi.fn()
        },
        message: { placeholder: 'Message', value: '', inputRef: createRef(), onChange: vi.fn(), onFocus: vi.fn() },
        sender: { picture: <i />, signature: 'From: me', showFace: null },
        preview: <i data-testid="wrapped" />,
        box: { label: 'Box', name: 'Gift box', price: 'Price: 1', paid: true, onPrevious: vi.fn(), onNext: vi.fn() },
        ribbon: { label: 'Ribbon', name: 'Red', enabled: false, onPrevious: vi.fn(), onNext: vi.fn() },
        colors: {
            title: 'Colour',
            items: [
                { id: 7, color: '#ff0000' },
                { id: 8, color: '#00ff00' }
            ],
            selectedId: 7,
            enabled: true,
            onPick: vi.fn()
        },
        cancelLabel: 'Cancel',
        giveLabel: 'Give gift',
        isBuying: false,
        onClose: vi.fn(),
        onGive: vi.fn()
    });

    it('picks a friend, a box, a colour and gives the gift through the handlers it is given', () => {
        const props = giftProps();

        render(<HandheldCatalogGiftView {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'Andy' }));
        expect(props.recipient.onPick).toHaveBeenCalledWith('Andy');

        fireEvent.focus(screen.getByTestId('handheld-gift-recipient'));
        expect(props.recipient.onFocus).toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('handheld-gift-box-next'));
        expect(props.box.onNext).toHaveBeenCalledOnce();

        // A box without a ribbon: its arrows are off, as on the desktop.
        expect(screen.getByTestId('handheld-gift-ribbon-next')).toBeDisabled();

        expect(screen.getByRole('button', { name: '#ff0000' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: '#00ff00' }));
        expect(props.colors.onPick).toHaveBeenCalledWith(8);

        fireEvent.click(screen.getByTestId('handheld-gift-give'));
        expect(props.onGive).toHaveBeenCalledOnce();
        expect(screen.getByTestId('window')).toHaveAttribute('data-sheet', 'true');
    });

    it('cannot be given twice while the purchase runs and shows the moderator switch only when given', () => {
        const props = { ...giftProps(), isBuying: true };

        render(<HandheldCatalogGiftView {...props} />);

        expect(screen.getByTestId('handheld-gift-give')).toBeDisabled();
        expect(screen.queryByRole('checkbox')).toBeNull();
    });
});

describe('the bigger shop windows on a phone', () => {
    it('posts a marketplace offer only with a valid price and steps the amount within its limits', () => {
        const onPost = vi.fn();
        const onAmount = vi.fn();
        const base = {
            title: 'Marketplace offer',
            picture: <i />,
            unique: null,
            rarity: null,
            name: 'Throne',
            expiration: '2 days',
            isNft: false,
            amount: { label: 'Amount', value: '4', max: 4, onChange: onAmount },
            stats: [{ name: 'lowest', text: 'Lowest: 18' }],
            copyLabel: 'Copy',
            finalText: 'Revenue: 19',
            postLabel: 'Post offer',
            cancelLabel: 'Cancel',
            onCopySuggested: vi.fn(),
            onPost,
            onClose: vi.fn()
        };

        const { rerender } = render(<HandheldMarketplacePostOfferView {...base} price={{ label: 'Price', value: '', valid: false, onChange: vi.fn() }} />);

        expect(screen.getByTestId('handheld-marketplace-post')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'More' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Less' }));
        expect(onAmount).toHaveBeenCalledWith('3');

        rerender(<HandheldMarketplacePostOfferView {...base} price={{ label: 'Price', value: '20', valid: true, onChange: vi.fn() }} />);
        fireEvent.click(screen.getByTestId('handheld-marketplace-post'));
        expect(onPost).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByTestId('handheld-marketplace-copy'));
        expect(base.onCopySuggested).toHaveBeenCalledOnce();
    });

    it('buys a targeted offer from the bottom bar and minimises it from the header', () => {
        const onBuy = vi.fn();
        const onMinimize = vi.fn();
        const props = {
            title: 'Deal',
            imageUrl: '/deal.png',
            descriptionHtml: { __html: 'Three rare furni' },
            timeLeft: '2 days',
            priceLabel: 'Price',
            price: [{ amount: 30, type: -1 }],
            quantity: null,
            warning: null,
            buyLabel: 'Buy',
            buyDisabled: false,
            onBuy,
            onMinimize
        };

        const { rerender } = render(<HandheldOfferWindowView {...props} />);

        fireEvent.click(screen.getByTestId('handheld-offer-buy'));
        expect(onBuy).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));
        expect(onMinimize).toHaveBeenCalledOnce();

        rerender(<HandheldOfferWindowView {...props} buyDisabled warning="Not enough credits" />);
        expect(screen.getByTestId('handheld-offer-buy')).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('Not enough credits');
    });

    it('turns the special items and claims the reward through the hook handlers', () => {
        const handlers = { onPrevious: vi.fn(), onNext: vi.fn(), onPage: vi.fn(), onClose: vi.fn(), onClaim: vi.fn() };

        render(
            <HandheldSpecialItemsDisplayView
                claim={{ info: 'See all', label: 'Claim', enabled: true, onClaim: handlers.onClaim }}
                item={{ name: 'Throne', description: 'Royal', icon: <i />, blend: 1 }}
                pages={[
                    { index: 0, name: 'Throne', selected: true },
                    { index: 1, name: 'Crown', selected: false }
                ]}
                setDescription="A set"
                setTitle="Royal"
                stage={<div data-testid="stage" />}
                title="Royal Set"
                onClose={handlers.onClose}
                onNext={handlers.onNext}
                onPage={handlers.onPage}
                onPrevious={handlers.onPrevious}
            />
        );

        fireEvent.click(screen.getByTestId('handheld-special-items-next'));
        fireEvent.click(screen.getByTestId('handheld-special-items-previous'));
        fireEvent.click(screen.getByRole('button', { name: 'Crown' }));
        fireEvent.click(screen.getByTestId('handheld-special-items-claim'));

        expect(handlers.onNext).toHaveBeenCalledOnce();
        expect(handlers.onPrevious).toHaveBeenCalledOnce();
        expect(handlers.onPage).toHaveBeenCalledWith(1);
        expect(handlers.onClaim).toHaveBeenCalledOnce();
        expect(screen.getByTestId('stage')).toBeInTheDocument();
    });
});

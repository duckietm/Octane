/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';
import { selectOption } from '../../test-utils/selectOption';

const config: Record<string, unknown> = {};

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        FriendlyTime: { format: (seconds: number) => `${Math.round(seconds)}s` },
        GetConfigurationValue: (key: string, fallback: unknown) => (key in config ? config[key] : fallback),
        LocalizeText: (key: string) => key,
        SanitizeHtml: (text: string) => text,
        localizeWithFallback: (_key: string, fallback: string, params: string[] = [], values: string[] = []) =>
            (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback)
    };
});
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../common', async () => {
    const { Select } = await vi.importActual<typeof import('../../common/Select')>('../../common/Select');

    return {
        Select,
        OctaneCardView: ({ children, classNames = [] }: { children: React.ReactNode; classNames?: string[] }) => (
            <div className={classNames.join(' ')} data-testid="desktop-card">
                {children}
            </div>
        ),
        OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <div>{headerText}</div>,
        LayoutBadgeImageView: ({ badgeCode }: { badgeCode: string }) => <i data-image={badgeCode} />,
        LayoutPetImageView: () => <i />,
        LayoutFurniIconImageView: ({ productClassId }: { productClassId: number }) => <i data-image={`icon-${productClassId}`} />,
        LayoutFurniImageView: ({ productClassId }: { productClassId: number }) => <i data-image={`furni-${productClassId}`} />
    };
});

// The window itself is DraggableWindow's business (and tested there); here it is a plain box that shows what it was given.
vi.mock('../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

const notification = { simpleAlert: vi.fn(), showConfirm: vi.fn() };

vi.mock('../../hooks/notification', () => ({ useNotification: () => notification }));
vi.mock('../../hooks/inventory/useInventoryFurni', () => ({
    useInventoryFurni: () => ({
        groupItems: [
            {
                isWallItem: false,
                type: 501,
                items: [
                    { id: 9001, rentable: false },
                    { id: 9002, rentable: false }
                ]
            }
        ],
        activate: () => 1,
        deactivate: () => undefined
    })
}));

let state: Record<string, unknown> = {};

vi.mock('../../hooks/collectibles/useCollectibles', () => ({
    useCollectibles: () => state,
    isCollectiblesEnabled: () => true,
    getCollectibleProductName: (product: { productCode?: string } | null) => product?.productCode ?? 'unknown'
}));

import { CollectiblesHubView } from './CollectiblesHubView';
import { CollectiblesRewardBoxView } from './CollectiblesRewardBoxView';

const product = (productCode: string, amount = 0, productTypeId = 1, itemTypeId = '100') => ({
    productCode,
    productTypeId,
    itemTypeId,
    rarity: 'rare',
    score: 25,
    amount,
    petFigure: ''
});

const collection = (collectionId: string, items: ReturnType<typeof product>[], extra: Record<string, unknown> = {}) => ({
    collectionId,
    collectionName: `Set ${collectionId}`,
    items,
    score: 50,
    goal: 200,
    completionXp: 100,
    bonusItem: null,
    bonusClaim: null,
    rewardItem: null,
    rewardClaim: null,
    bonusStart: -1,
    bonusEnd: -1,
    ...extra
});

const fullState = () => ({
    isVisible: true,
    currentTab: 'rewards',
    setCurrentTab: vi.fn((tab: string) => {
        state.currentTab = tab;
    }),
    closeHub: vi.fn(),
    score: { score: 1240, highestScore: 1600, level: 7 },
    emeralds: 300,
    silver: 1250,
    rewardClaims: [
        { claimId: 1, setId: 'pirates', setName: 'Pirates', product: product('pirate_flag'), claimLimit: 2, claimedAmount: 0, validTo: 0 },
        { claimId: 2, setId: 'space', setName: 'Space', product: product('rocket'), claimLimit: 1, claimedAmount: 0, validTo: 0 }
    ],
    claimAllPending: false,
    claimAllRewards: vi.fn(),
    collections: [
        collection('pirates', [product('pirate_flag', 1), product('pirate_chest', 0)], {
            rewardItem: product('pirate_ship'),
            rewardClaim: { status: 0, claimedAmount: 0, claimLimit: 1 }
        }),
        collection('space', [product('rocket', 1)])
    ],
    pendingClaims: {},
    claimCollection: vi.fn(),
    shopOffers: [
        { productCode: 'gold_duck', emeraldPrice: 50, mintLimit: 100, mintedCount: 12, product: product('gold_duck') },
        { productCode: 'diamond_duck', emeraldPrice: 900, mintLimit: -1, mintedCount: 0, product: product('diamond_duck') },
        { productCode: 'pet_dragon', emeraldPrice: 80, mintLimit: 5, mintedCount: 5, product: product('pet_dragon', 0, 10) }
    ],
    purchasePending: false,
    purchase: vi.fn(),
    mintables: [
        { itemType: 's', itemTypeId: 501, price: 3, startTime: 0, endTime: 4102444800, regionLocked: false },
        { itemType: 's', itemTypeId: 502, price: 5, startTime: 0, endTime: 4102444800, regionLocked: true }
    ],
    mintTokens: 10,
    mintTokenOffers: [
        { offerId: 1, amount: 5, silverPrice: 100 },
        { offerId: 2, amount: 20, silverPrice: 350 }
    ],
    mintingEnabled: true,
    mintPending: false,
    activeWallet: 'collector',
    buyMintTokens: vi.fn(),
    mint: vi.fn(),
    transferFee: 25,
    collectorWallet: 'collector',
    transferPending: false,
    transfer: vi.fn(),
    rewardQueue: [],
    dismissReward: vi.fn()
});

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const openTab = (tab: string) => {
    state.currentTab = tab;

    return render(<CollectiblesHubView />);
};

beforeEach(() => {
    state = fullState();
    for (const key of Object.keys(config)) delete config[key];
    Object.assign(config, { 'nft.shop.enabled': true, 'nft.minting.enabled': true, 'collectibles.transfer.enabled': true });
    notification.simpleAlert.mockReset();
    notification.showConfirm.mockReset();
    notification.showConfirm.mockImplementation((_text: string, onConfirm: () => void) => onConfirm());
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the collectibles hub on a phone', () => {
    it('is a full-screen sheet with the level, the balances and the tabs as pills', () => {
        phone();
        openTab('rewards');

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(screen.queryByTestId('desktop-card')).toBeNull();
        expect(document.querySelector('.octane-handheld-sheet.octane-handheld-collectibles')).toBeTruthy();
        expect(screen.getByTestId('collectibles-level').textContent).toBe('7');
        expect(screen.getByTestId('collectibles-silver').textContent).toBe('1250');
        expect(screen.getByTestId('collectibles-emeralds').textContent).toBe('300');

        const tabs = [...document.querySelectorAll('.octane-handheld-sheet__tab')].map(
            (tab) => tab.querySelector('.octane-handheld-sheet__tab-label')?.textContent
        );

        expect(tabs).toEqual(['Rewards', 'Collectibles', 'Shop', 'Minting', 'Transfer', 'Info']);
        // The rewards waiting are counted on their tab.
        expect(document.querySelector('.octane-handheld-sheet__tab.is-active .octane-handheld-sheet__tab-count')?.textContent).toBe('2');

        fireEvent.click(document.querySelectorAll('.octane-handheld-sheet__tab')[2]);
        expect(state.setCurrentTab).toHaveBeenCalledWith('shop');

        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));
        expect(state.closeHub).toHaveBeenCalledTimes(1);
    });

    it('leaves out the tabs the configuration turns off', () => {
        config['nft.shop.enabled'] = false;
        config['nft.minting.enabled'] = false;
        config['collectibles.transfer.enabled'] = false;
        phone();
        openTab('rewards');

        expect(document.querySelectorAll('.octane-handheld-sheet__tab')).toHaveLength(3);
    });

    it('shows the collector card and the rewards, and claims them all from the bar', () => {
        phone();
        openTab('rewards');

        expect(screen.getByTestId('collectibles-score').textContent).toBe('1240');
        expect(screen.getAllByTestId('collectibles-reward-item')).toHaveLength(2);
        expect(within(screen.getAllByTestId('collectibles-reward-item')[0]).getByText('x2')).toBeTruthy();

        fireEvent.click(screen.getByTestId('collectibles-claim-all'));
        expect(state.claimAllRewards).toHaveBeenCalledTimes(1);
    });

    it('opens a set as a page, shows a product, claims the prize, and goes back', () => {
        phone();
        openTab('collections');

        expect(screen.queryByTestId('collectibles-collection')).toBeNull();
        expect(within(screen.getByTestId('collectibles-set-pirates')).getByText('1/2')).toBeTruthy();

        fireEvent.click(screen.getByTestId('collectibles-set-pirates'));

        const page = screen.getByTestId('collectibles-collection');

        expect(screen.queryByTestId('collectibles-set-pirates')).toBeNull();
        expect(within(page).getByText('Set pirates')).toBeTruthy();
        expect(within(page).getByTestId('collectibles-completion').textContent).toContain('pirate_ship');
        expect(screen.getByTestId('collectibles-item-pirate_chest').dataset.owned).toBe('false');

        fireEvent.click(screen.getByTestId('collectibles-claim'));
        expect(state.claimCollection).toHaveBeenCalledWith('pirates', false);

        // A product shows its facts (and the claim waits until the set is shown again).
        fireEvent.click(screen.getByTestId('collectibles-item-pirate_flag'));
        expect(screen.getByTestId('collectibles-item-detail').textContent).toContain('You earned 25 XP with this item!');
        expect(screen.queryByTestId('collectibles-claim')).toBeNull();
        fireEvent.click(screen.getByTestId('collectibles-item-pirate_flag'));
        expect(screen.queryByTestId('collectibles-item-detail')).toBeNull();

        fireEvent.click(screen.getByTestId('collectibles-back'));
        expect(screen.getByTestId('collectibles-set-space')).toBeTruthy();
        expect(screen.queryByTestId('collectibles-collection')).toBeNull();
    });

    it('searches and sorts the sets', () => {
        phone();
        openTab('collections');

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'spa' } });
        expect(screen.queryByTestId('collectibles-set-pirates')).toBeNull();
        expect(screen.getByTestId('collectibles-set-space')).toBeTruthy();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'zzz' } });
        expect(screen.getByText('No collection matches your search.')).toBeTruthy();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: '' } });
        selectOption(screen.getByRole('combobox', { name: 'Sort' }), 'Progress');
        const order = [...document.querySelectorAll('.octane-handheld-collectibles__set')].map((set) => set.getAttribute('data-testid'));

        // Space is complete (100 %), pirates half done.
        expect(order).toEqual(['collectibles-set-space', 'collectibles-set-pirates']);
    });

    it('shows the sets and the chosen set side by side on its side, without a way back', () => {
        phone('landscape');
        openTab('collections');

        expect(screen.getByTestId('collectibles-set-pirates').getAttribute('aria-pressed')).toBe('true');
        expect(within(screen.getByTestId('collectibles-collection')).getByText('Set pirates')).toBeTruthy();
        expect(screen.queryByTestId('collectibles-back')).toBeNull();

        fireEvent.click(screen.getByTestId('collectibles-set-space'));
        expect(within(screen.getByTestId('collectibles-collection')).getByText('Set space')).toBeTruthy();
    });

    it('opens an offer as a page and buys it through the same confirmation', () => {
        phone();
        openTab('shop');

        // Furni and pets are two chips; the furni are shown first.
        expect(screen.getByRole('button', { name: 'Furni' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Pets' }).getAttribute('aria-pressed')).toBe('false');
        expect(screen.queryByTestId('collectibles-offer-pet_dragon')).toBeNull();

        fireEvent.click(screen.getByTestId('collectibles-offer-gold_duck'));
        expect(screen.getByTestId('collectibles-shop-name').textContent).toBe('gold_duck');
        expect(screen.getByTestId('collectibles-mint-limit').textContent).toBe('12 of 100 minted');

        fireEvent.click(screen.getByTestId('collectibles-buy'));
        expect(notification.showConfirm).toHaveBeenCalledTimes(1);
        expect(state.purchase).toHaveBeenCalledWith((state.shopOffers as { productCode: string }[])[0]);

        fireEvent.click(screen.getByTestId('collectibles-back'));
        fireEvent.click(screen.getByTestId('collectibles-offer-diamond_duck'));
        fireEvent.click(screen.getByTestId('collectibles-buy'));
        // Too few emeralds: the same alert as on the desktop, no purchase.
        expect(notification.simpleAlert).toHaveBeenCalledTimes(1);
        expect(state.purchase).toHaveBeenCalledTimes(1);
    });

    it('keeps an offer without mints left from being bought', () => {
        phone();
        openTab('shop');

        fireEvent.click(screen.getByRole('button', { name: 'Pets' }));
        expect(screen.getByTestId('collectibles-offer-pet_dragon').dataset.soldout).toBe('true');
        fireEvent.click(screen.getByTestId('collectibles-offer-pet_dragon'));

        expect(screen.getByTestId('collectibles-buy').hasAttribute('disabled')).toBe(true);
    });

    it('collects a relic and buys stamps with the tab handlers', () => {
        phone();
        openTab('minting');

        expect(screen.getByTestId('collectibles-stamps').textContent).toBe('10');
        expect(within(screen.getByTestId('collectibles-relic-501')).getByText('x2')).toBeTruthy();
        expect(within(screen.getByTestId('collectibles-relic-502')).getByText('x0')).toBeTruthy();

        selectOption(screen.getByRole('combobox', { name: 'Buy more stamps' }), '20');
        fireEvent.click(screen.getByTestId('collectibles-buy-stamps'));
        expect(state.buyMintTokens).toHaveBeenCalledWith((state.mintTokenOffers as unknown[])[1]);

        fireEvent.click(screen.getByTestId('collectibles-relic-501'));
        expect(screen.getByTestId('collectibles-mint-detail').textContent).toContain('This relic can be collected.');
        fireEvent.click(screen.getByTestId('collectibles-collect'));
        expect(state.mint).toHaveBeenCalledWith(9001);

        // A relic of which the inventory holds nothing cannot be collected.
        fireEvent.click(screen.getByTestId('collectibles-back'));
        fireEvent.click(screen.getByTestId('collectibles-relic-502'));
        expect(screen.getByTestId('collectibles-mint-detail').textContent).toContain("You don't have any relics to collect yet.");
        expect(screen.getByTestId('collectibles-collect').hasAttribute('disabled')).toBe(true);
    });

    it('transfers to a named user after the confirmation', () => {
        phone();
        openTab('transfer');

        const button = screen.getByTestId('collectibles-transfer-button');

        expect(button.hasAttribute('disabled')).toBe(true);
        expect(screen.getByTestId('collectibles-transfer-fee').textContent).toBe('25');

        fireEvent.change(screen.getByTestId('collectibles-transfer-recipient'), { target: { value: ' Frank ' } });
        fireEvent.click(button);

        expect(state.transfer).toHaveBeenCalledWith('Frank');
        expect((screen.getByTestId('collectibles-transfer-recipient') as HTMLInputElement).value).toBe('');
    });

    it('opens the reward box as a card and steps through the waiting rewards', () => {
        state.rewardQueue = [product('ruby_throne'), product('emerald_lamp')];
        phone();
        render(<CollectiblesRewardBoxView />);

        expect(screen.getByTestId('window').dataset.sheet).toBe('false');
        expect(screen.getByTestId('collectibles-reward-box-name').textContent).toBe('ruby_throne');
        expect(screen.getByTestId('collectibles-reward-box').textContent).toContain('RARE');

        fireEvent.click(screen.getByTestId('collectibles-reward-box-ok'));
        expect(state.dismissReward).toHaveBeenCalledTimes(1);
    });

    it('keeps the desktop hub and reward box when not on a phone', () => {
        state.rewardQueue = [product('ruby_throne')];
        openTab('shop');
        render(<CollectiblesRewardBoxView />);

        expect(document.querySelector('.octane-handheld-sheet')).toBeNull();
        expect(document.querySelector('.octane-handheld-collectibles-box')).toBeNull();
        expect(document.querySelector('.octane-collectibles-hub')).toBeTruthy();
        expect(document.querySelector('.octane-collectibles-reward-box')).toBeTruthy();
        expect(screen.getByTestId('collectibles-shop').classList.contains('octane-collectibles-split')).toBe(true);
    });
});

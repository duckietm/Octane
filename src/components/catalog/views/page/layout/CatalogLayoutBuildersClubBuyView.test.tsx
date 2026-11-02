import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    sent: [] as unknown[],
    windows: [] as number[],
    secondsLeft: 0,
    credits: 1000,
    skipConfirmation: false,
    handlers: new Map<string, (event: { type: string }) => void>()
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'image.library.url' ? 'https://cdn.example/c_images/' : fallback),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    SendMessageComposer: (composer: unknown) => state.sent.push(composer)
}));

vi.mock('../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../hooks')>()),
    useCatalogData: () => ({ secondsLeft: state.secondsLeft }),
    useCatalogSkipPurchaseConfirmation: () => [state.skipConfirmation],
    useClubOffers: (windowId: number) => {
        state.windows.push(windowId);

        return {
            data: [
                { offerId: 11, productCode: 'bc_month', months: 1, extraDays: 0, priceCredits: 25, priceActivityPoints: 0, priceActivityPointsType: 5 },
                { offerId: 12, productCode: 'bc_big', months: 0, extraDays: 0, priceCredits: 5000, priceActivityPoints: 0, priceActivityPointsType: 5 }
            ]
        };
    },
    usePurse: () => ({ getCurrencyAmount: (type: number) => (type === -1 ? state.credits : 0) }),
    useUiEvent: (type: string, handler: (event: { type: string }) => void) => state.handlers.set(type, handler)
}));

import { PurchaseFromCatalogComposer } from '@octane/renderer';
import { act } from 'react';
import { CatalogPurchaseNotAllowedEvent } from '../../../../../events';
import { CatalogLayoutBuildersClubBuyView } from './CatalogLayoutBuildersClubBuyView';

const page = (layoutCode: string) =>
    ({ pageId: 70, layoutCode, localization: { getText: (index: number) => (index === 0 ? 'Build without limits!' : ''), getImage: () => '' } }) as any;

const renderPage = (layoutCode: string) => render(<CatalogLayoutBuildersClubBuyView page={page(layoutCode)} hideNavigation={() => undefined} />);

afterEach(cleanup);

beforeEach(() => {
    state.sent.length = 0;
    state.windows.length = 0;
    state.secondsLeft = 0;
    state.credits = 1000;
    state.skipConfirmation = false;
});

describe('Builders Club pages (AIR layout_builders_club_*)', () => {
    it('shows the description and one row per membership offer on the front page, without the art', () => {
        const { container } = renderPage('builders_club_frontpage');

        expect(screen.getByText('Build without limits!')).toBeInTheDocument();
        expect(state.windows).toContain(2);
        expect(screen.getByText('bc month')).toBeInTheDocument();
        expect(container.querySelector('.octane-catalog-air-bc__art')).toBeNull();
    });

    it('needs a membership to buy add-ons, as AIR warns', () => {
        const { container } = renderPage('builders_club_addons');

        expect(state.windows).toContain(3);
        expect(container.querySelector('.octane-catalog-air-bc__art img')).toHaveAttribute('src', 'https://cdn.example/c_images/catalogue/bc_top.png');
        expect(screen.getByRole('status')).toHaveTextContent('builder.addon_page.warning.trial');
        expect(screen.getAllByRole('button', { name: 'buy' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    });

    it('buys an add-on after the confirm step for a member', () => {
        state.secondsLeft = 3600;
        renderPage('builders_club_addons');

        expect(screen.queryByRole('status')).toBeNull();

        fireEvent.click(screen.getAllByRole('button', { name: 'buy' })[0]);
        fireEvent.click(screen.getByRole('button', { name: 'catalog.marketplace.confirm_title' }));

        const purchase = state.sent.find((composer) => composer instanceof PurchaseFromCatalogComposer) as any;

        expect(purchase.getMessageArray()).toEqual([70, 11, null, 1]);
    });

    it('ends the purchase when the server refuses it as not allowed, instead of spinning forever', () => {
        state.secondsLeft = 3600;
        renderPage('builders_club_addons');

        fireEvent.click(screen.getAllByRole('button', { name: 'buy' })[0]);
        fireEvent.click(screen.getByRole('button', { name: 'catalog.marketplace.confirm_title' }));
        act(() => state.handlers.get(CatalogPurchaseNotAllowedEvent.NOT_ALLOWED)?.({ type: CatalogPurchaseNotAllowedEvent.NOT_ALLOWED }));

        expect(screen.getByRole('button', { name: 'generic.failed' })).toBeTruthy();
    });

    it('marks an offer the player cannot pay for', () => {
        renderPage('builders_club_loyalty');

        expect(screen.getByRole('button', { name: 'catalog.alert.notenough.title' })).toBeDisabled();
        expect(screen.getAllByRole('button', { name: 'buy' })).toHaveLength(1);
    });
});

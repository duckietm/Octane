import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    CreateLinkEvent: vi.fn(),
    SendMessageComposer: vi.fn(),
    purse: { credits: 10, diamonds: 0 }
}));

vi.mock('@octane/renderer', () => ({
    GetTargetedOfferComposer: class {},
    PurchaseTargetedOfferComposer: class {},
    TargetedOfferData: class {}
}));

vi.mock('../../../../api', () => ({
    CreateLinkEvent: api.CreateLinkEvent,
    FriendlyTime: { format: () => '1h' },
    GetConfigurationValue: () => '',
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SanitizeHtml: (html: string) => html,
    SendMessageComposer: api.SendMessageComposer
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, onClick, disabled }: { children: unknown; onClick?: () => void; disabled?: boolean }) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children as string}
        </button>
    ),
    Column: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    Flex: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    LayoutCurrencyIcon: () => <i />,
    OctaneCardContentView: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <div>{headerText}</div>,
    OctaneCardView: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    Text: ({ children }: { children: unknown }) => <span>{children as string}</span>
}));

vi.mock('../../../../hooks', () => ({
    usePurse: () => ({ getCurrencyAmount: (type: number) => (type === -1 ? api.purse.credits : api.purse.diamonds) })
}));

import { OfferWindowView } from './OfferWindowView';

afterEach(() => {
    cleanup();
    api.CreateLinkEvent.mockClear();
    api.purse.credits = 10;
    api.purse.diamonds = 0;
});

const offer = {
    id: 1,
    title: 'offer.title',
    description: 'desc',
    imageUrl: 'offer.png',
    expirationTime: Date.now() + 60_000,
    priceInCredits: 25,
    priceInActivityPoints: 0,
    activityPointType: 5,
    purchaseLimit: 1
} as any;

describe('OfferWindowView', () => {
    it('offers a way to get credits and says why buying is blocked when the purse is short', () => {
        render(<OfferWindowView offer={offer} setOpen={() => undefined} />);

        expect(screen.getByText('targeted.offer.button.buy')).toBeDisabled();
        expect(screen.getByText("You don't have enough credits or diamonds yet!")).toBeInTheDocument();

        fireEvent.click(screen.getByText('Go get credits'));

        expect(api.CreateLinkEvent).toHaveBeenCalledWith('catalog/open/credits');
    });

    it('hides the credits shortcut and enables buying once the offer is affordable', () => {
        api.purse.credits = 25;

        render(<OfferWindowView offer={offer} setOpen={() => undefined} />);

        expect(screen.getByText('targeted.offer.button.buy')).toBeEnabled();
        expect(screen.queryByText('Go get credits')).not.toBeInTheDocument();
        expect(screen.queryByText("You don't have enough credits or diamonds yet!")).not.toBeInTheDocument();
    });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stats = vi.hoisted(() => ({
    current: null as null | {
        averagePrice: number;
        offerCount: number;
        historyLength: number;
        dayOffsets: number[];
        averagePrices: number[];
        soldAmounts: number[];
    }
}));

vi.mock('../../../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string, parameters: string[] = null, replacements: string[] = null) =>
        (parameters ?? []).reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements[index]), fallback),
    MarketplaceOfferData: class {
        public static TYPE_FLOOR = 1;
        public static TYPE_WALL = 2;
    },
    ProductTypeEnum: { FLOOR: 's', WALL: 'i' }
}));

vi.mock('../../../../../../common', () => ({
    Button: ({ children, onClick, active }: { children: unknown; onClick?: () => void; active?: boolean }) => (
        <button data-active={active ? 'true' : 'false'} type="button" onClick={onClick}>
            {children as string}
        </button>
    ),
    Column: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    LayoutFurniImageView: () => <div data-testid="furni-image" />,
    LayoutGridItem: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    Text: ({ children }: { children: unknown }) => <span>{children as string}</span>
}));

vi.mock('../../../../../../hooks', () => ({
    getMarketplaceStatsCategory: (isWall: boolean, isLimited: boolean) => (isLimited ? 3 : isWall ? 2 : 1),
    useMarketplaceItemStats: () => ({ data: stats.current })
}));

import { MarketplaceOfferDetailsView } from './MarketplaceOfferDetailsView';

afterEach(() => {
    cleanup();
    stats.current = null;
});

const offer = {
    offerId: 5,
    furniId: 77,
    furniType: 1,
    extraData: '',
    stuffData: { uniqueNumber: 0 },
    price: 12,
    averagePrice: 15,
    offerCount: 4,
    isUniqueLimitedItem: false
} as any;

describe('MarketplaceOfferDetailsView', () => {
    it('shows the offer facts and hands back and buy to the parent', () => {
        const onBack = vi.fn();
        const onBuy = vi.fn();

        render(<MarketplaceOfferDetailsView offerData={offer} onBack={onBack} onBuy={onBuy} />);

        expect(screen.getByText('roomItem.name.77')).toBeInTheDocument();
        expect(screen.getByText('Cheapest price: 12 Credits')).toBeInTheDocument();
        expect(screen.getByText('Offer count: 4')).toBeInTheDocument();
        expect(screen.getByText('Average price in last 30 days: 15 Credits')).toBeInTheDocument();
        expect(screen.getByText('No data (need two days of trading to show graph)')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Back to item list'));
        fireEvent.click(screen.getByText('buy'));

        expect(onBack).toHaveBeenCalledOnce();
        expect(onBuy).toHaveBeenCalledWith(offer);
    });

    it('switches the chart between price development and trade volume once stats arrive', () => {
        stats.current = {
            averagePrice: 15,
            offerCount: 9,
            historyLength: 14,
            dayOffsets: [-1, 0],
            averagePrices: [10, 20],
            soldAmounts: [1, 2]
        };

        render(<MarketplaceOfferDetailsView offerData={offer} onBack={() => undefined} onBuy={() => undefined} />);

        expect(screen.getByText('Offer count: 9')).toBeInTheDocument();
        expect(screen.getByText('Average sale price during last 14 days')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Trade volume'));

        expect(screen.getByText('Trade volumes during last 14 days')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Trade volume')).toHaveAttribute('data-active', 'true');
    });
});

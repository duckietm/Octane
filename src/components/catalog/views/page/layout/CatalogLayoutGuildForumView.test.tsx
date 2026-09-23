import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';
import { CatalogLayouGuildForumView } from './CatalogLayoutGuildForumView';

vi.mock('../../../../../api', () => ({
    LocalizeText: (key: string) => key,
    SanitizeHtml: (value: string) => value
}));

vi.mock('../../../../../common', () => ({
    Column: ({ alignItems: _alignItems, children, overflow: _overflow, size: _size, ...props }: any) => <div {...props}>{children}</div>,
    Flex: ({ alignItems: _alignItems, children, gap: _gap, ...props }: any) => <div {...props}>{children}</div>,
    Grid: ({ children, overflow: _overflow, ...props }: any) => <div {...props}>{children}</div>
}));

vi.mock('../../../../../common/layout/LayoutImage', () => ({ LayoutImage: () => null }));

vi.mock('../../../../../hooks', () => ({
    useCatalogData: vi.fn(),
    useCatalogUiState: vi.fn(),
    useUserGroups: vi.fn()
}));

vi.mock('../widgets/CatalogFirstProductSelectorWidgetView', () => ({ CatalogFirstProductSelectorWidgetView: () => null }));
vi.mock('../widgets/CatalogGuildBadgeWidgetView', () => ({ CatalogGuildBadgeWidgetView: () => <div data-testid="guild-badge" /> }));
vi.mock('../widgets/CatalogGuildSelectorWidgetView', () => ({ CatalogGuildSelectorWidgetView: () => <div data-testid="guild-selector" /> }));
vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({
    CatalogPurchaseWidgetView: ({ disabled = false }: { disabled?: boolean }) => (
        <button disabled={disabled} type="button">
            purchase
        </button>
    )
}));
vi.mock('../widgets/CatalogTotalPriceWidget', () => ({ CatalogTotalPriceWidget: () => null }));

const page = {
    localization: {
        getImage: () => '',
        getText: () => 'forum teaser'
    }
};

const groups = [
    { badgeCode: 'b7', colorA: 'ffffff', colorB: '000000', groupId: 7, groupName: 'With forum', hasForum: true },
    { badgeCode: 'b8', colorA: 'ffffff', colorB: '000000', groupId: 8, groupName: 'Without forum', hasForum: false }
];

const selectGroup = (groupId: number | null) => {
    vi.mocked(useCatalogUiState).mockReturnValue({ purchaseOptions: { extraData: groupId === null ? null : groupId.toString() } } as any);
};

const renderView = () => render(<CatalogLayouGuildForumView page={page as any} hideNavigation={() => undefined} />);

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogData).mockReturnValue({ currentOffer: { offerId: 3 } } as any);
    vi.mocked(useUserGroups).mockReturnValue({ data: groups } as any);
    selectGroup(8);
});

describe('guild forum page', () => {
    it('previews the selected guild badge next to the selector', () => {
        renderView();

        expect(screen.getByTestId('guild-badge')).toBeInTheDocument();
        expect(screen.getByTestId('guild-selector')).toBeInTheDocument();
    });

    it('warns and blocks the purchase when the selected guild already has a forum', () => {
        selectGroup(7);
        renderView();

        expect(screen.getByText('catalog.alert.group_has_forum')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'purchase' })).toBeDisabled();
    });

    it('sells the forum to a guild without one', () => {
        renderView();

        expect(screen.queryByText('catalog.alert.group_has_forum')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'purchase' })).toBeEnabled();
    });

    it('offers nothing to buy without a selectable guild', () => {
        vi.mocked(useUserGroups).mockReturnValue({ data: [] } as any);
        selectGroup(null);
        renderView();

        expect(screen.queryByRole('button', { name: 'purchase' })).not.toBeInTheDocument();
        expect(screen.queryByText('catalog.alert.group_has_forum')).not.toBeInTheDocument();
    });
});

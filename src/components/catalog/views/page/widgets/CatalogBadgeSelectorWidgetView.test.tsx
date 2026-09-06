import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetConfigurationValue } from '../../../../../api';
import { useCatalogData, useCatalogUiState, useInventoryBadges } from '../../../../../hooks';
import { CatalogBadgeSelectorWidgetView } from './CatalogBadgeSelectorWidgetView';

const rendererTypes = vi.hoisted(() => {
    class StringDataType {
        private value: string[] = [];

        public setValue(value: string[]) {
            this.value = value;
        }

        public getValue(index: number) {
            return this.value[index];
        }
    }

    return { StringDataType };
});

vi.mock('@octane/renderer', () => ({ StringDataType: rendererTypes.StringDataType }));

vi.mock('../../../../../api', () => ({
    GetConfigurationValue: vi.fn(),
    LocalizeBadgeDescription: (code: string) => ({ BETA: 'Builder helper', GAMMA: 'Music fan' })[code] ?? '',
    LocalizeBadgeName: (code: string) => ({ ALPHA: 'Alpha badge', BETA: 'Beta badge', GAMMA: 'Gamma badge' })[code] ?? code,
    LocalizeText: (key: string) => key
}));

vi.mock('../../../../../common', () => ({
    AutoGrid: ({ children, columnCount: _columnCount, columnMinHeight: _columnMinHeight, columnMinWidth: _columnMinWidth, overflow: _overflow, ...props }: any) => (
        <div {...props}>{children}</div>
    ),
    ClassicScrollAreaView: ({ children, scrollStep: _scrollStep, ...props }: any) => <div {...props}>{children}</div>,
    LayoutBadgeImageView: ({ badgeCode }: any) => <span>{badgeCode}</span>,
    LayoutGridItem: ({ children, itemActive, ...props }: any) => (
        <button aria-pressed={itemActive} type="button" {...props}>
            {children}
        </button>
    )
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogData: vi.fn(),
    useCatalogUiState: vi.fn(),
    useInventoryBadges: vi.fn()
}));

let badgeCodes: string[];
let purchaseOptions: any;
const setPurchaseOptions = vi.fn((updater: (value: any) => any) => {
    purchaseOptions = updater(purchaseOptions);
});

const renderSelector = () => render(<CatalogBadgeSelectorWidgetView />);

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    badgeCodes = ['ALPHA', 'BETA', 'GAMMA'];
    purchaseOptions = { extraData: null, extraParamRequired: false, previewStuffData: null };
    vi.mocked(GetConfigurationValue).mockReturnValue('GAMMA' as any);
    vi.mocked(useCatalogData).mockReturnValue({ currentOffer: { offerId: 10 } } as any);
    vi.mocked(useCatalogUiState).mockReturnValue({ setPurchaseOptions } as any);
    vi.mocked(useInventoryBadges).mockImplementation(
        () =>
            ({
                activate: () => 1,
                badgeCodes,
                deactivate: () => undefined
            }) as any
    );
});

describe('catalog badge selector', () => {
    it('uses the AIR6 search label and clears the active filter from its close control', () => {
        renderSelector();

        const search = screen.getByRole('searchbox', { name: 'generic.search' });

        fireEvent.change(search, { target: { value: 'helper' } });

        expect(screen.queryByRole('option', { name: 'ALPHA' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'generic.clear' }));

        expect(search).toHaveValue('');
        expect(screen.getByRole('option', { name: 'ALPHA' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'generic.clear' })).not.toBeInTheDocument();
    });

    it('excludes configured badges and filters them by localized name or description', () => {
        renderSelector();

        expect(screen.queryByRole('option', { name: 'GAMMA' })).not.toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'ALPHA' })).toBeInTheDocument();

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'helper' } });

        expect(screen.queryByRole('option', { name: 'ALPHA' })).not.toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'BETA' })).toBeInTheDocument();
    });

    it('uses the selected badge as the required purchase parameter and preview data', () => {
        renderSelector();

        fireEvent.click(screen.getByRole('option', { name: 'BETA' }));

        expect(purchaseOptions.extraParamRequired).toBe(true);
        expect(purchaseOptions.extraData).toBe('BETA');
        expect(purchaseOptions.previewStuffData.getValue(1)).toBe('BETA');
    });

    it('clears a selected badge when the live inventory no longer contains it', () => {
        const view = renderSelector();

        fireEvent.click(screen.getByRole('option', { name: 'ALPHA' }));
        badgeCodes = ['BETA'];
        view.rerender(<CatalogBadgeSelectorWidgetView />);

        expect(purchaseOptions.extraData).toBeNull();
        expect(purchaseOptions.previewStuffData).toBeNull();
    });

});

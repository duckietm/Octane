import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNavigatorUiStore } from '../../../../hooks';
import { NavigatorSearchResultView } from './NavigatorSearchResultView';

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        NavigatorSearchCloseComposer: class {
            constructor(_code?: string) {}
        },
        NavigatorSearchOpenComposer: class {
            constructor(_code?: string) {}
        },
        NavigatorCategoryListModeComposer: class {
            constructor(_code?: string, _mode?: number) {}
        }
    };
});

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        SendMessageComposer: vi.fn()
    };
});

vi.mock('../../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks');

    return {
        ...actual,
        useNavigatorData: () => ({ topLevelContext: { code: 'hotel_view' } })
    };
});

const result = {
    code: 'popular',
    data: 'Popular rooms',
    action: 0,
    closed: false,
    mode: 0,
    rooms: []
} as any;

afterEach(() => cleanup());

describe('AIR navigator result blocks', () => {
    it('uses the persisted collapse state and exposes it through the category button', () => {
        useNavigatorUiStore.setState({ collapsedResultCodes: ['popular'], resultViewModes: {} });

        render(<NavigatorSearchResultView searchResult={result} />);

        const categoryButton = screen.getByRole('button', { name: 'Popular rooms' });
        expect(categoryButton).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(categoryButton);

        expect(categoryButton).toHaveAttribute('aria-expanded', 'true');
        expect(useNavigatorUiStore.getState().collapsedResultCodes).toEqual([]);
    });

    it('uses the persisted tile mode and switches only that result block back to a list', () => {
        useNavigatorUiStore.setState({ collapsedResultCodes: [], resultViewModes: { popular: 1, newest: 1 } });

        render(<NavigatorSearchResultView searchResult={result} />);

        const listButton = screen.getByRole('button', { name: 'Show rooms as a list' });
        fireEvent.click(listButton);

        expect(useNavigatorUiStore.getState().resultViewModes).toEqual({ popular: 0, newest: 1 });
    });

    it('keeps a server-closed AIR category closed until the user explicitly expands it', () => {
        useNavigatorUiStore.setState({ collapsedResultCodes: [], expandedResultCodes: [] } as any);

        render(<NavigatorSearchResultView searchResult={{ ...result, closed: true }} />);

        const categoryButton = screen.getByRole('button', { name: 'Popular rooms' });
        expect(categoryButton).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(categoryButton);

        expect(categoryButton).toHaveAttribute('aria-expanded', 'true');
        expect((useNavigatorUiStore.getState() as any).expandedResultCodes).toEqual(['popular']);
    });
});

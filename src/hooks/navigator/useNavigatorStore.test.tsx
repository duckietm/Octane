import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedHookRegistry } from '../../state/useSharedHook';
import { useNavigatorData, useNavigatorUiState } from './index';
import { useNavigatorUiStore } from './navigatorUiStore';

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
        },
        NavigatorSettingsSaveComposer: class {
            constructor(_x?: number, _y?: number, _w?: number, _h?: number, _open?: boolean, _mode?: number) {}
        }
    };
});

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        SendMessageComposer: vi.fn()
    };
});

const wrapper = ({ children }: { children: React.ReactNode }) => <SharedHookRegistry>{children}</SharedHookRegistry>;

beforeEach(() => {
    window.localStorage.clear();
});

describe('navigator filter shapes (smoke)', () => {
    it('useNavigatorData returns the documented keys', async () => {
        const { result } = renderHook(() => useNavigatorData(), { wrapper });

        await waitFor(() => expect(result.current).not.toBeNull());

        expect(Object.keys(result.current).sort()).toEqual(
            ['categories', 'eventCategories', 'navigatorData', 'navigatorSearches', 'topLevelContext', 'topLevelContexts'].sort()
        );
    });

    it('useNavigatorUiState returns the documented state', () => {
        const { result } = renderHook(() => useNavigatorUiState());
        expect(Object.keys(result.current).sort()).toEqual(
            [
                'currentFilter',
                'currentTabCode',
                'collapsedResultCodes',
                'expandedResultCodes',
                'isCreatorOpen',
                'isLoading',
                'isOpenSavesSearches',
                'isReady',
                'isRoomInfoOpen',
                'isRoomLinkOpen',
                'isVisible',
                'needsInit',
                'needsSearch',
                'resultViewModes',
                'windowHeight'
            ].sort()
        );
    });

    it('persists the AIR quick-links pane when the user collapses it', () => {
        useNavigatorUiStore.setState({ isOpenSavesSearches: true });

        useNavigatorUiStore.getState().toggleSavesSearches();

        expect(useNavigatorUiStore.getState().isOpenSavesSearches).toBe(false);
        expect(window.localStorage.getItem('nitro.navigator.air.quickLinksOpen')).toBe('0');
    });

    it('hydrates AIR category and view preferences from local storage', () => {
        window.localStorage.setItem('nitro.navigator.air.quickLinksOpen', '0');
        window.localStorage.setItem('nitro.navigator.air.collapsedResults', '["popular"]');
        window.localStorage.setItem('nitro.navigator.air.expandedResults', '["newest"]');
        window.localStorage.setItem('nitro.navigator.air.resultViewModes', '{"popular":1}');
        const store = useNavigatorUiStore.getState() as any;

        expect(typeof store.hydrateAirPreferences).toBe('function');

        store.hydrateAirPreferences();

        expect(useNavigatorUiStore.getState()).toMatchObject({
            isOpenSavesSearches: false,
            collapsedResultCodes: ['popular'],
            expandedResultCodes: ['newest'],
            resultViewModes: { popular: 1 }
        });
    });

    it('persists AIR category collapse independently for each result block', () => {
        useNavigatorUiStore.setState({ collapsedResultCodes: [] } as any);
        const store = useNavigatorUiStore.getState() as any;

        expect(typeof store.toggleResultCollapsed).toBe('function');

        store.toggleResultCollapsed('popular');

        expect(useNavigatorUiStore.getState().collapsedResultCodes).toEqual(['popular']);
        expect(window.localStorage.getItem('nitro.navigator.air.collapsedResults')).toBe('["popular"]');
    });

    it('persists a list or tile mode for each AIR result block', () => {
        useNavigatorUiStore.setState({ resultViewModes: {} } as any);
        const store = useNavigatorUiStore.getState() as any;

        expect(typeof store.setResultViewMode).toBe('function');

        store.setResultViewMode('popular', 1);

        expect(useNavigatorUiStore.getState().resultViewModes).toEqual({ popular: 1 });
        expect(window.localStorage.getItem('nitro.navigator.air.resultViewModes')).toBe('{"popular":1}');
    });
});

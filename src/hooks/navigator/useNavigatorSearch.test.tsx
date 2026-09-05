/* @vitest-environment jsdom */

import { NavigatorSearchEvent, NavigatorSearchResultSet } from '@octane/renderer';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockEventDispatcher } from '../../octane-renderer.mock';
import { useNavigatorUiStore } from './navigatorUiStore';
import { useNavigatorSearch } from './useNavigatorSearch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// NOTE: useNavigatorSearch uses useMessageEvent + useState (NOT useOctaneQuery).
// The one-shot query pattern was reverted upstream (05d71dd1) because it left
// the UI blank when the listener never matched. These tests exercise the
// event-driven implementation directly — no QueryClient scaffolding.

/** Build a fake NavigatorSearchEvent whose getParser() returns a result with `code`. */
const makeSearchEvent = (code: string) => {
    // Cast constructors as `any` so tsgo doesn't check required args against
    // the real renderer SDK types (the mock stubs have no required args).
    const result = new (NavigatorSearchResultSet as any)() as any;
    result.code = code;
    result.data = '';
    result.results = [];

    const ev = new (NavigatorSearchEvent as any)() as any;
    ev.getParser = () => ({ result });
    return ev;
};

const INITIAL_UI = {
    isVisible: false,
    isReady: false,
    isCreatorOpen: false,
    isRoomInfoOpen: false,
    isRoomLinkOpen: false,
    isOpenSavesSearches: false,
    isLoading: false,
    needsInit: true,
    needsSearch: false,
    currentTabCode: '',
    currentFilter: ''
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNavigatorSearch', () => {
    beforeEach(() => {
        useNavigatorUiStore.setState(INITIAL_UI);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('1. with empty tabCode no fetch starts (the request effect is gated)', () => {
        const { result } = renderHook(() => useNavigatorSearch());

        // No tab selected → the request effect short-circuits, nothing fetches.
        expect(result.current.isFetching).toBe(false);
        expect(result.current.searchResult).toBeNull();
    });

    it('2. after setTab("public"), the hook starts fetching and a matching event resolves it', async () => {
        const { result } = renderHook(() => useNavigatorSearch());

        act(() => {
            useNavigatorUiStore.getState().setTab('public');
        });

        await waitFor(() => expect(result.current.isFetching).toBe(true));

        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('public') as any);
        });

        await waitFor(() => expect(result.current.searchResult).not.toBeNull());
        expect((result.current.searchResult as any).code).toBe('public');
        expect(result.current.isFetching).toBe(false);
    });

    it('3. after setFilter("cocco"), a new fetch fires and a matching event resolves it', async () => {
        const { result } = renderHook(() => useNavigatorSearch());

        act(() => {
            useNavigatorUiStore.getState().setTab('public');
        });
        await waitFor(() => expect(result.current.isFetching).toBe(true));
        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('public') as any);
        });
        await waitFor(() => expect(result.current.isFetching).toBe(false));

        act(() => {
            useNavigatorUiStore.getState().setFilter('cocco');
        });

        await waitFor(() => expect(result.current.isFetching).toBe(true));

        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('public') as any);
        });

        await waitFor(() => expect(result.current.isFetching).toBe(false));
        expect((result.current.searchResult as any).code).toBe('public');
        expect(useNavigatorUiStore.getState().currentFilter).toBe('cocco');
    });

    it('4. after setTab("events"), currentFilter resets to "" and a new fetch fires for events', async () => {
        const { result } = renderHook(() => useNavigatorSearch());

        act(() => {
            useNavigatorUiStore.getState().setTab('public');
            useNavigatorUiStore.getState().setFilter('some-filter');
        });

        await waitFor(() => expect(result.current.isFetching).toBe(true));
        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('public') as any);
        });
        await waitFor(() => expect(result.current.isFetching).toBe(false));

        act(() => {
            useNavigatorUiStore.getState().setTab('events');
        });

        expect(useNavigatorUiStore.getState().currentFilter).toBe('');
        expect(useNavigatorUiStore.getState().currentTabCode).toBe('events');

        await waitFor(() => expect(result.current.isFetching).toBe(true));

        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('events') as any);
        });

        await waitFor(() => expect(result.current.isFetching).toBe(false));
        expect((result.current.searchResult as any).code).toBe('events');
    });

    it('5. NavigatorSearchEvent with result.code === currentTabCode is accepted and updates data', async () => {
        const { result } = renderHook(() => useNavigatorSearch());

        act(() => {
            useNavigatorUiStore.getState().setTab('public');
        });

        await waitFor(() => expect(result.current.isFetching).toBe(true));

        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('public') as any);
        });

        await waitFor(() => {
            expect(result.current.searchResult).not.toBeNull();
            expect((result.current.searchResult as any).code).toBe('public');
        });
    });

    it('6. NavigatorSearchEvent with result.code !== currentTabCode is REJECTED — data unchanged', async () => {
        const { result } = renderHook(() => useNavigatorSearch());

        act(() => {
            useNavigatorUiStore.getState().setTab('public');
        });

        await waitFor(() => expect(result.current.isFetching).toBe(true));

        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('wrong_tab') as any);
        });

        // The wrong-tab event is filtered out by the accept guard.
        expect(result.current.searchResult).toBeNull();

        act(() => {
            mockEventDispatcher.dispatchEvent(makeSearchEvent('public') as any);
        });

        await waitFor(() => expect(result.current.searchResult).not.toBeNull());
        expect((result.current.searchResult as any).code).toBe('public');
    });
});

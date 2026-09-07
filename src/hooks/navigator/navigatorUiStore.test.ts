import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const INITIAL = {
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

describe('useNavigatorUiStore', () => {
    beforeEach(() => {
        useNavigatorUiStore.setState(INITIAL);
    });

    it('exposes the documented defaults', () => {
        const s = useNavigatorUiStore.getState();
        expect(s.isVisible).toBe(false);
        expect(s.isReady).toBe(false);
        expect(s.isCreatorOpen).toBe(false);
        expect(s.isRoomInfoOpen).toBe(false);
        expect(s.isRoomLinkOpen).toBe(false);
        expect(s.isOpenSavesSearches).toBe(false);
        expect(s.isLoading).toBe(false);
        expect(s.needsInit).toBe(true);
        expect(s.needsSearch).toBe(false);
        expect(s.currentTabCode).toBe('');
        expect(s.currentFilter).toBe('');
    });

    describe('show / hide / toggle', () => {
        it('show() sets isVisible true and requests a search', () => {
            useNavigatorUiStore.getState().show();
            expect(useNavigatorUiStore.getState().isVisible).toBe(true);
            expect(useNavigatorUiStore.getState().needsSearch).toBe(true);
        });

        it('hide() sets isVisible false without touching needsSearch', () => {
            useNavigatorUiStore.setState({ isVisible: true, needsSearch: false });
            useNavigatorUiStore.getState().hide();
            expect(useNavigatorUiStore.getState().isVisible).toBe(false);
            expect(useNavigatorUiStore.getState().needsSearch).toBe(false);
        });

        it('toggle() flips visibility and requests a search on show', () => {
            useNavigatorUiStore.getState().toggle();
            expect(useNavigatorUiStore.getState().isVisible).toBe(true);
            expect(useNavigatorUiStore.getState().needsSearch).toBe(true);

            useNavigatorUiStore.setState({ needsSearch: false });
            useNavigatorUiStore.getState().toggle();
            expect(useNavigatorUiStore.getState().isVisible).toBe(false);
            expect(useNavigatorUiStore.getState().needsSearch).toBe(false);
        });
    });

    describe('creator panel', () => {
        it('openCreator() opens both visible and creator', () => {
            useNavigatorUiStore.getState().openCreator();
            expect(useNavigatorUiStore.getState().isVisible).toBe(true);
            expect(useNavigatorUiStore.getState().isCreatorOpen).toBe(true);
        });

        it('closeCreator() closes only the creator panel', () => {
            useNavigatorUiStore.setState({ isVisible: true, isCreatorOpen: true });
            useNavigatorUiStore.getState().closeCreator();
            expect(useNavigatorUiStore.getState().isCreatorOpen).toBe(false);
            expect(useNavigatorUiStore.getState().isVisible).toBe(true);
        });
    });

    describe('roomInfo / roomLink / savesSearches', () => {
        it('setRoomInfoOpen(true) and toggleRoomInfo flip the flag', () => {
            useNavigatorUiStore.getState().setRoomInfoOpen(true);
            expect(useNavigatorUiStore.getState().isRoomInfoOpen).toBe(true);
            useNavigatorUiStore.getState().toggleRoomInfo();
            expect(useNavigatorUiStore.getState().isRoomInfoOpen).toBe(false);
        });

        it('setRoomLinkOpen(true) and toggleRoomLink flip the flag', () => {
            useNavigatorUiStore.getState().setRoomLinkOpen(true);
            expect(useNavigatorUiStore.getState().isRoomLinkOpen).toBe(true);
            useNavigatorUiStore.getState().toggleRoomLink();
            expect(useNavigatorUiStore.getState().isRoomLinkOpen).toBe(false);
        });

        it('toggleSavesSearches() flips the sidebar flag', () => {
            useNavigatorUiStore.getState().toggleSavesSearches();
            expect(useNavigatorUiStore.getState().isOpenSavesSearches).toBe(true);
            useNavigatorUiStore.getState().toggleSavesSearches();
            expect(useNavigatorUiStore.getState().isOpenSavesSearches).toBe(false);
        });
    });

    describe('lifecycle flags', () => {
        it('setLoading(true) and setLoading(false) toggle isLoading', () => {
            useNavigatorUiStore.getState().setLoading(true);
            expect(useNavigatorUiStore.getState().isLoading).toBe(true);
            useNavigatorUiStore.getState().setLoading(false);
            expect(useNavigatorUiStore.getState().isLoading).toBe(false);
        });

        it('markReady() sets isReady true and is idempotent', () => {
            useNavigatorUiStore.getState().markReady();
            expect(useNavigatorUiStore.getState().isReady).toBe(true);
            useNavigatorUiStore.getState().markReady();
            expect(useNavigatorUiStore.getState().isReady).toBe(true);
        });

        it('markInitDone() flips needsInit to false', () => {
            useNavigatorUiStore.getState().markInitDone();
            expect(useNavigatorUiStore.getState().needsInit).toBe(false);
        });

        it('requestSearch() + consumeSearchRequest() are symmetric', () => {
            useNavigatorUiStore.getState().requestSearch();
            expect(useNavigatorUiStore.getState().needsSearch).toBe(true);
            useNavigatorUiStore.getState().consumeSearchRequest();
            expect(useNavigatorUiStore.getState().needsSearch).toBe(false);
        });
    });

    describe('tab + filter', () => {
        it("setTab('public') sets currentTabCode and clears currentFilter", () => {
            useNavigatorUiStore.setState({ currentTabCode: 'events', currentFilter: 'habbo' });
            useNavigatorUiStore.getState().setTab('public');
            expect(useNavigatorUiStore.getState().currentTabCode).toBe('public');
            expect(useNavigatorUiStore.getState().currentFilter).toBe('');
        });

        it("setFilter('cocco') sets currentFilter without touching tab", () => {
            useNavigatorUiStore.getState().setTab('events');
            useNavigatorUiStore.getState().setFilter('cocco');
            expect(useNavigatorUiStore.getState().currentTabCode).toBe('events');
            expect(useNavigatorUiStore.getState().currentFilter).toBe('cocco');
        });

        it('setTab on same code still resets currentFilter', () => {
            useNavigatorUiStore.setState({ currentTabCode: 'public', currentFilter: 'test' });
            useNavigatorUiStore.getState().setTab('public');
            expect(useNavigatorUiStore.getState().currentTabCode).toBe('public');
            expect(useNavigatorUiStore.getState().currentFilter).toBe('');
        });
    });
});

import { useNavigatorUiStore } from './navigatorUiStore';

export const useNavigatorUiState = () => {
    const isVisible = useNavigatorUiStore((s) => s.isVisible);
    const isReady = useNavigatorUiStore((s) => s.isReady);
    const isCreatorOpen = useNavigatorUiStore((s) => s.isCreatorOpen);
    const isRoomInfoOpen = useNavigatorUiStore((s) => s.isRoomInfoOpen);
    const isRoomLinkOpen = useNavigatorUiStore((s) => s.isRoomLinkOpen);
    const isOpenSavesSearches = useNavigatorUiStore((s) => s.isOpenSavesSearches);
    const isLoading = useNavigatorUiStore((s) => s.isLoading);
    const needsInit = useNavigatorUiStore((s) => s.needsInit);
    const needsSearch = useNavigatorUiStore((s) => s.needsSearch);
    const currentTabCode = useNavigatorUiStore((s) => s.currentTabCode);
    const currentFilter = useNavigatorUiStore((s) => s.currentFilter);
    const windowHeight = useNavigatorUiStore((s) => s.windowHeight);
    const collapsedResultCodes = useNavigatorUiStore((s) => s.collapsedResultCodes);
    const expandedResultCodes = useNavigatorUiStore((s) => s.expandedResultCodes);
    const resultViewModes = useNavigatorUiStore((s) => s.resultViewModes);
    return {
        isVisible,
        isReady,
        isCreatorOpen,
        isRoomInfoOpen,
        isRoomLinkOpen,
        isOpenSavesSearches,
        isLoading,
        needsInit,
        needsSearch,
        currentTabCode,
        currentFilter,
        windowHeight,
        collapsedResultCodes,
        expandedResultCodes,
        resultViewModes
    };
};

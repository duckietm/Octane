import { createOctaneStore } from '../../state/createOctaneStore';

/**
 * State of the official "enforce category" modal
 * (ShowEnforceRoomCategoryDialogEvent -> EnforceCategoryCtrl.show). The
 * dialog has no close button: it only goes away once the OK button sent the
 * new category and trade mode, or the room session ends.
 */
export interface NavigatorEnforceCategoryState {
    isOpen: boolean;
    selectionType: number;
    show(selectionType: number): void;
    close(): void;
}

export const useNavigatorEnforceCategoryStore = createOctaneStore<NavigatorEnforceCategoryState>()((set) => ({
    isOpen: false,
    selectionType: 0,
    show: (selectionType) => set({ isOpen: true, selectionType }),
    close: () => set({ isOpen: false })
}));

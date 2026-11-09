import { RoomDataParser } from '@octane/renderer';
import { createOctaneStore } from '../../state/createOctaneStore';

export type NavigatorRoomInfoAnchorKind = 'info' | 'row' | 'tile';

const POPUP_HIDE_DELAY_MS = 4000;

export type NavigatorRoomInfoPopupState = {
    room: RoomDataParser | null;
    visible: boolean;
    x: number;
    y: number;
    hovered: boolean;
};

export type NavigatorRoomInfoPopupActions = {
    hide(): void;
    setHovered(hovered: boolean): void;
    toggleFromInfo(room: RoomDataParser, rect: DOMRect): void;
    retargetIfVisible(room: RoomDataParser, kind: NavigatorRoomInfoAnchorKind, rect: DOMRect): void;
};

const hideTimer = { id: 0, hideAt: 0 };

const clearHideTimer = () => {
    if (hideTimer.id) window.clearInterval(hideTimer.id);
    hideTimer.id = 0;
};

const armHideTimer = () => {
    hideTimer.hideAt = Date.now() + POPUP_HIDE_DELAY_MS;
    if (hideTimer.id) return;

    hideTimer.id = window.setInterval(() => {
        const state = useNavigatorRoomInfoPopupStore.getState();
        if (!state.visible) {
            clearHideTimer();
            return;
        }
        if (Date.now() < hideTimer.hideAt) return;
        if (state.hovered) return;
        state.hide();
    }, 250);
};

const anchorPoint = (kind: NavigatorRoomInfoAnchorKind, rect: DOMRect) => {
    const midY = rect.top + rect.height / 2;

    if (kind === 'tile') return { x: rect.right - 6, y: midY + 56 };
    if (kind === 'row') return { x: rect.right + 20, y: midY };

    return { x: rect.right, y: midY };
};

export const useNavigatorRoomInfoPopupStore = createOctaneStore<NavigatorRoomInfoPopupState & NavigatorRoomInfoPopupActions>()((set, get) => ({
    room: null,
    visible: false,
    x: 0,
    y: 0,
    hovered: false,

    hide: () => {
        clearHideTimer();
        set({ visible: false, room: null, hovered: false });
    },

    setHovered: (hovered) => {
        set({ hovered });
        if (hovered) hideTimer.hideAt = Date.now() + POPUP_HIDE_DELAY_MS;
    },

    toggleFromInfo: (room, rect) => {
        const current = get();
        if (current.visible) {
            current.hide();
            return;
        }

        const point = anchorPoint('info', rect);
        armHideTimer();
        set({
            room,
            visible: true,
            hovered: false,
            x: point.x,
            y: point.y
        });
    },

    retargetIfVisible: (room, kind, rect) => {
        if (!get().visible) return;

        const point = anchorPoint(kind, rect);
        armHideTimer();
        set({
            room,
            visible: true,
            x: point.x,
            y: point.y
        });
    }
}));

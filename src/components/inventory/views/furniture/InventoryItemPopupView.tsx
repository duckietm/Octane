import { FC, MouseEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GroupItem } from '../../../../api';
import { LayoutLimitedEditionCompactPlateView } from '../../../../common';

// The official `item_popup` layout (ItemPopupCtrl): a 203px white card with the item name as a
// small headline, the item image capped at 180x200 and the LTD plate for limited furni. It hangs
// off the right edge of the hovered thumb (LOCATION_RIGHT, 5px overlap, vertically centred) with
// an arrow pointing back at it, and moves to the left side when the screen ends.
export const ITEM_POPUP_WIDTH = 203;
export const ITEM_POPUP_BOUNDS_MARGIN = 5;
export const ITEM_POPUP_CLOSE_DELAY_MS = 100;

export interface ItemPopupAnchorRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export type ItemPopupSide = 'right' | 'left';

/** Pure placement: right of the anchor unless the card would leave the viewport. */
export const resolveItemPopupSide = (anchor: ItemPopupAnchorRect, viewportWidth: number, width: number = ITEM_POPUP_WIDTH): ItemPopupSide =>
    anchor.left + anchor.width - ITEM_POPUP_BOUNDS_MARGIN + width <= viewportWidth ? 'right' : 'left';

export const resolveItemPopupLeft = (anchor: ItemPopupAnchorRect, side: ItemPopupSide, width: number = ITEM_POPUP_WIDTH): number =>
    side === 'right' ? anchor.left + anchor.width - ITEM_POPUP_BOUNDS_MARGIN : anchor.left + ITEM_POPUP_BOUNDS_MARGIN - width;

interface InventoryItemPopupState {
    groupItem: GroupItem;
    anchor: ItemPopupAnchorRect;
}

export const InventoryItemPopupView: FC<{ groupItem: GroupItem; anchor: ItemPopupAnchorRect }> = (props) => {
    const { groupItem = null, anchor = null } = props;
    const cardRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    useLayoutEffect(() => {
        if (cardRef.current) setHeight(cardRef.current.offsetHeight);
    }, [groupItem]);

    if (!groupItem || !anchor) return null;

    const side = resolveItemPopupSide(anchor, window.innerWidth);
    const left = resolveItemPopupLeft(anchor, side);
    const top = anchor.top + (anchor.height - height) / 2;
    const isUnique = !!groupItem.stuffData && groupItem.stuffData.uniqueNumber > 0;

    return (
        <div
            ref={cardRef}
            className={`octane-inventory-item-popup is-${side}`}
            data-testid="inventory-item-popup"
            role="tooltip"
            style={{ left, top, width: ITEM_POPUP_WIDTH }}
        >
            <div className="octane-inventory-item-popup__name">{groupItem.name}</div>
            {isUnique && (
                <LayoutLimitedEditionCompactPlateView
                    className="octane-inventory-item-popup__ltd"
                    uniqueNumber={groupItem.stuffData.uniqueNumber}
                    uniqueSeries={groupItem.stuffData.uniqueSeries}
                />
            )}
            <div className="octane-inventory-item-popup__image">{groupItem.iconUrl && <img alt="" src={groupItem.iconUrl} />}</div>
            <div className="octane-inventory-item-popup__arrow" />
        </div>
    );
};

/**
 * Hover controller for the trade grids (TradingView.thumbEventProc): WME_OVER shows the card
 * at once, WME_OUT hides it after CLOSE_DELAY_MS so moving between thumbs does not flicker.
 */
export const useInventoryItemPopup = () => {
    const [state, setState] = useState<InventoryItemPopupState>(null);
    const closeTimerRef = useRef<number | null>(null);

    const clearCloseTimer = () => {
        if (closeTimerRef.current === null) return;

        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    };

    const hide = useCallback(() => {
        clearCloseTimer();
        setState(null);
    }, []);

    const hideDelayed = useCallback(() => {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            closeTimerRef.current = null;
            setState(null);
        }, ITEM_POPUP_CLOSE_DELAY_MS);
    }, []);

    const show = useCallback((groupItem: GroupItem, target: Element) => {
        clearCloseTimer();

        if (!groupItem || !target) return;

        const rect = target.getBoundingClientRect();

        setState({ groupItem, anchor: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } });
    }, []);

    useEffect(() => clearCloseTimer, []);

    useEffect(() => {
        if (!state) return;

        window.addEventListener('scroll', hide, true);

        return () => window.removeEventListener('scroll', hide, true);
    }, [state, hide]);

    const getAnchorProps = (groupItem: GroupItem) => ({
        onMouseEnter: (event: MouseEvent<Element>) => show(groupItem, event.currentTarget),
        onMouseLeave: () => hideDelayed()
    });

    const popup = state ? createPortal(<InventoryItemPopupView anchor={state.anchor} groupItem={state.groupItem} />, document.body) : null;

    return { getAnchorProps, popup, hide };
};

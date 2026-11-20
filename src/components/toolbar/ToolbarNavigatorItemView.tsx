import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ToolbarItemView } from './ToolbarItemView';

/** Official ToolbarHoverCtrl: the menu stays half a second after the pointer leaves the icon and the menu. */
const HIDE_DELAY_MS = 500;
const MENU_WIDTH = 252;
const MENU_GAP = 8;

/** The quick menu's entries, in the official order, each as the link it raises. */
export const NAVIGATOR_HOVER_ENTRIES: readonly { key: string; fallback: string; link: string }[] = [
    { key: 'navigator.title', fallback: 'Navigator', link: 'navigator/show' },
    { key: 'toolbar.icon.label.exitroom.home', fallback: 'Home room', link: 'navigator/goto/home' },
    { key: 'navigator.navisel.myfavourites', fallback: 'My favourites', link: 'navigator/tab/me/favorites' },
    { key: 'navigator.createroom.create', fallback: 'Create room', link: 'navigator/create' },
    { key: 'navigator.navisel.visitedrooms', fallback: 'Visited rooms', link: 'navigator/tab/me/history' },
    { key: 'navigator.navisel.frequentvisits', fallback: 'Frequent visits', link: 'navigator/tab/me/history_freq' }
];

/**
 * The navigator's toolbar icon with the official hover menu: Navigator, Home room, Favourites, Create room, Visited
 * rooms and Frequent visits. A click on the icon itself still opens and closes the navigator.
 */
export const ToolbarNavigatorItemView: FC = () => {
    // Where the menu goes on screen: its left edge and the gap under it, read from the icon when it opens. The menu is
    // drawn on the page itself, because the toolbar clips whatever is drawn inside an icon.
    const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
    const iconRef = useRef<HTMLDivElement>(null);
    const isOpen = !!position;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelHide = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);

        hideTimer.current = null;
    };

    const show = () => {
        cancelHide();

        const rect = iconRef.current?.getBoundingClientRect();

        if (!rect) return;

        setPosition({ left: Math.max(4, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 4)), bottom: window.innerHeight - rect.top + MENU_GAP });
    };

    const hideLater = () => {
        cancelHide();
        hideTimer.current = setTimeout(() => setPosition(null), HIDE_DELAY_MS);
    };

    const hideNow = () => {
        cancelHide();
        setPosition(null);
    };

    useEffect(() => cancelHide, []);

    return (
        <>
            <ToolbarItemView
                ref={iconRef}
                className="tb-icon"
                icon="rooms"
                onClick={() => {
                    hideNow();
                    CreateLinkEvent('navigator/toggle');
                }}
                onMouseEnter={show}
                onMouseLeave={hideLater}
            />
            {isOpen &&
                createPortal(
                    <NativeTextTree>
                        <div
                            className="octane-toolbar-navigator-hover"
                            style={{ left: position.left, bottom: position.bottom }}
                            onMouseEnter={cancelHide}
                            onMouseLeave={hideLater}
                        >
                            {NAVIGATOR_HOVER_ENTRIES.map((entry) => (
                                <BaseButton
                                    key={entry.link}
                                    className="octane-toolbar-navigator-hover__item"
                                    onClick={() => {
                                        hideNow();
                                        CreateLinkEvent(entry.link);
                                    }}
                                >
                                    {localizeWithFallback(entry.key, entry.fallback)}
                                </BaseButton>
                            ))}
                        </div>
                    </NativeTextTree>,
                    document.body
                )}
        </>
    );
};

import { CreateLinkEvent } from '@octane/renderer';
import { Dispatch, FC, MouseEvent, PropsWithChildren, SetStateAction } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutAvatarImageView, LayoutItemCountView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { openHandheldChatLine } from '../../hooks/handheld/useHandheldChatLine';
import { ToolbarMeView } from './ToolbarMeView';
import { ToolbarNewAdditionsLabel } from './ToolbarNewAdditionsLabel';

/** A desktop toolbar entry that has no icon of its own on the phone dock: it is listed in the Me popup instead. */
export interface HandheldToolbarExtra {
    key: string;
    /** The `icon-*` class of the toolbar sprite. */
    icon: string;
    label: string;
    count?: number;
    onClick: () => void;
}

interface HandheldToolbarViewProps {
    isInRoom: boolean;
    /** The player can write in this room (in a room, and not watching it as a spectator). */
    hasRoomChat: boolean;
    /** The room chat composer is open: it has the bottom of the screen, so the dock is not drawn. */
    composerOpen?: boolean;
    figure: string | null;
    inventoryCount: number;
    /** Everything waiting behind the head: the Me menu's own counts plus those of the extra entries. */
    meCount: number;
    friendRequestCount: number;
    messengerUnreadCount: number;
    /** Extra class of the messenger sprite (its blink frames while something is unread). */
    messengerIconClass?: string;
    isMeOpen: boolean;
    setMeOpen: Dispatch<SetStateAction<boolean>>;
    unseenAchievementCount: number;
    useGuideTool: boolean;
    extras: readonly HandheldToolbarExtra[];
    onMessenger: () => void;
}

/**
 * One dock cell: a thumb-sized button around a toolbar sprite, with its count at the top right. `lead` is the cell
 * that stands apart at the end of the dock as a round button of its own (the room chat, or the messenger).
 */
const DockButton: FC<PropsWithChildren<{ name: string; label: string; count?: number; lead?: boolean; expanded?: boolean; onClick: (event: MouseEvent<HTMLButtonElement>) => void }>> = ({
    name,
    label,
    count = 0,
    lead = false,
    expanded,
    onClick,
    children
}) => (
    <BaseButton
        type="button"
        className={`octane-handheld-dock__button${lead ? ' is-lead' : ''}`}
        data-dock={name}
        aria-expanded={expanded}
        aria-label={label}
        onClick={(event) => {
            onClick(event);
            // As on the desktop toolbar: the window an entry opens takes the room tools' place.
            CreateLinkEvent('room-tools/collapse');
        }}
    >
        {children}
        {count > 0 && <LayoutItemCountView count={count} className="octane-toolbar-count octane-handheld-dock__count pointer-events-none" />}
    </BaseButton>
);

/** The room chat button's picture: one speech bubble with three dots, drawn here so it needs no image of its own. */
const ChatBubbleIcon: FC = () => (
    <svg aria-hidden="true" className="octane-handheld-dock__chat-art" viewBox="0 0 28 28">
        <path className="is-bubble" d="M7 4.5 H21 Q25.5 4.5 25.5 9 V15 Q25.5 19.5 21 19.5 H13.5 L8 24.5 V19.5 H7 Q2.5 19.5 2.5 15 V9 Q2.5 4.5 7 4.5 Z" />
        <path className="is-dots" d="M9 12 H9.01 M14 12 H14.01 M19 12 H19.01" />
    </svg>
);

/**
 * The phone toolbar: a floating glass pill with a single row of icons (navigator, catalogue, inventory, the
 * player's head in a blue ring, friends) and, standing apart at its end, one round button: the room chat in
 * green, the primary action in a room. Centred at the bottom in portrait, in the bottom left corner in landscape
 * (HandheldHud.css). The head opens the Me menu as a popup above the dock; that popup also lists every desktop
 * toolbar entry the dock has no room for, the messenger among them while the round button is the room chat. Where
 * there is no room to write in (the hotel view, or watching as a spectator) the round button is the messenger.
 * While the chat composer is open the dock is away.
 */
export const HandheldToolbarView: FC<HandheldToolbarViewProps> = (props) => {
    const {
        isInRoom,
        hasRoomChat,
        composerOpen = false,
        figure,
        inventoryCount,
        meCount,
        friendRequestCount,
        messengerUnreadCount,
        messengerIconClass = '',
        isMeOpen,
        setMeOpen,
        unseenAchievementCount,
        useGuideTool,
        extras,
        onMessenger
    } = props;

    const closeMe = () => setMeOpen(false);

    if (composerOpen) return null;

    return (
        <NativeTextTree>
            <div className="octane-handheld-dock" data-me-open={isMeOpen ? 'true' : undefined}>
                {isMeOpen && (
                    <div
                        className="octane-handheld-dock__me"
                        onClick={(event) => {
                            // An entry opens a window over the popup, so the popup goes away with the tap.
                            if ((event.target as Element).closest('button')) closeMe();
                        }}
                    >
                        <ToolbarMeView selectOwnAvatar={false} setMeExpanded={setMeOpen} unseenAchievementCount={unseenAchievementCount} useGuideTool={useGuideTool}>
                            {extras.length > 0 && <span aria-hidden="true" className="octane-handheld-dock__me-rule" />}
                            {extras.map((extra) => (
                                <BaseButton
                                    key={extra.key}
                                    type="button"
                                    className="octane-toolbar-me-item octane-handheld-dock__extra"
                                    data-name={extra.key}
                                    aria-label={extra.label}
                                    onClick={extra.onClick}
                                >
                                    <span className="octane-handheld-dock__extra-art">
                                        <span className={`octane-icon icon-${extra.icon}`} />
                                    </span>
                                    <span className="octane-toolbar-me-label">{extra.label}</span>
                                    {(extra.count ?? 0) > 0 && <LayoutItemCountView className="octane-toolbar-count" count={extra.count} />}
                                </BaseButton>
                            ))}
                        </ToolbarMeView>
                    </div>
                )}
                <div className="octane-handheld-dock__panel" role="toolbar">
                    <div className="octane-handheld-dock__pill">
                        <DockButton name="navigator" label={localizeWithFallback('octane.handheld.toolbar.navigator', 'Navigator')} onClick={() => CreateLinkEvent('navigator/toggle')}>
                            <span className="octane-icon icon-rooms tb-icon" />
                        </DockButton>
                        <DockButton name="catalog" label={localizeWithFallback('octane.handheld.toolbar.catalog', 'Catalogue')} onClick={() => CreateLinkEvent('catalog/toggle/normal')}>
                            <span className="octane-icon icon-catalog tb-icon" />
                            <ToolbarNewAdditionsLabel />
                        </DockButton>
                        {isInRoom && (
                            <DockButton
                                name="inventory"
                                label={localizeWithFallback('octane.handheld.toolbar.inventory', 'Inventory')}
                                count={inventoryCount}
                                onClick={() => CreateLinkEvent('inventory/toggle')}
                            >
                                <span className="octane-icon icon-inventory tb-icon" />
                            </DockButton>
                        )}
                        <DockButton
                            name="me"
                            label={localizeWithFallback('octane.handheld.toolbar.me', 'Me')}
                            count={meCount}
                            expanded={isMeOpen}
                            onClick={(event) => {
                                setMeOpen((value) => !value);
                                event.stopPropagation();
                            }}
                        >
                            <span className="octane-handheld-dock__head">
                                <span className="tb-memenu-avatar">
                                    <LayoutAvatarImageView airMeMenu={true} direction={3} figure={figure} />
                                </span>
                            </span>
                        </DockButton>
                        <DockButton
                            name="friends"
                            label={localizeWithFallback('octane.handheld.toolbar.friends', 'Friends')}
                            // With the room chat in the last cell the messenger has none of its own, so what is unread there shows here too.
                            count={friendRequestCount + (hasRoomChat ? messengerUnreadCount : 0)}
                            onClick={() => CreateLinkEvent('friends/toggle')}
                        >
                            <span className="octane-icon icon-friendall tb-icon" />
                        </DockButton>
                    </div>
                    {hasRoomChat ? (
                        <DockButton
                            name="chat"
                            lead
                            label={localizeWithFallback('octane.handheld.hud.chat', 'Chat')}
                            onClick={() => {
                                closeMe();
                                // Straight from the tap, so the phone brings its keyboard up with the composer.
                                openHandheldChatLine();
                            }}
                        >
                            <ChatBubbleIcon />
                        </DockButton>
                    ) : (
                        <DockButton lead name="messenger" label={localizeWithFallback('octane.handheld.toolbar.messenger', 'Messenger')} count={messengerUnreadCount} onClick={onMessenger}>
                            <span className={`octane-icon icon-message tb-icon ${messengerIconClass}`} />
                        </DockButton>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};

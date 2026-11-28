import { FC, ReactNode, RefObject, UIEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../../common/ToggleButton';

export interface HandheldChatWidgetWindowViewProps {
    title: string;
    hidePets: boolean;
    hideAvatars: boolean;
    hideBalloons: boolean;
    search: string;
    onHidePetsChange: (value: boolean) => void;
    onHideAvatarsChange: (value: boolean) => void;
    onToggleBalloons: () => void;
    onClear: () => void;
    onSearchChange: (value: string) => void;
    onClose: () => void;
    /** The scrolling list: ChatWidgetWindowView virtualises its rows and scrolls it, exactly as on the desktop. */
    listRef: RefObject<HTMLDivElement>;
    onScroll: (event: UIEvent<HTMLDivElement>) => void;
    /** The virtualised rows (ChatWidgetWindowView draws them as on the desktop). */
    children: ReactNode;
    showLatest: boolean;
    onLatest: () => void;
}

/**
 * The chat window (the "chat in a window" setting) on a phone (HandheldInventoryDialogs.css): a panel at the top of
 * the room, under the room chip, that ends above the composer and the keyboard. Its header has the filters button and
 * a 44 px close; the filters (hide pets, hide avatars, balloons, clear, search) open as a tray over the list.
 */
export const HandheldChatWidgetWindowView: FC<HandheldChatWidgetWindowViewProps> = (props) => {
    const {
        title,
        hidePets,
        hideAvatars,
        hideBalloons,
        search,
        onHidePetsChange,
        onHideAvatarsChange,
        onToggleBalloons,
        onClear,
        onSearchChange,
        onClose,
        listRef,
        onScroll,
        children,
        showLatest,
        onLatest
    } = props;
    const [filtersOpen, setFiltersOpen] = useState(false);
    const filtersLabel = localizeWithFallback('octane.handheld.inventory_dialogs.chat_filters', 'Filters');
    const filtering = hidePets || hideAvatars || hideBalloons || search.trim().length > 0;
    const target = typeof document !== 'undefined' ? (document.getElementById('draggable-windows-container') ?? document.body) : null;

    if (!target) return null;

    return createPortal(
        <section aria-label={title} className="octane-handheld-chatwin" data-testid="chat-window-panel">
            {/* The head and filters are labels; the bubbles below stay as the room draws them. */}
            <NativeTextTree>
                <div className="octane-handheld-chatwin__head">
                    <span className="octane-handheld-chatwin__title">{title}</span>
                    <ToggleButton
                        aria-label={filtersLabel}
                        className={`octane-handheld-chatwin__icon${filtering ? ' is-filtering' : ''}`}
                        pressed={filtersOpen}
                        onPressedChange={setFiltersOpen}
                    >
                        <svg aria-hidden="true" viewBox="0 0 16 16">
                            <path d="M2.5 4 H13.5 M4.5 8 H11.5 M6.5 12 H9.5" />
                        </svg>
                    </ToggleButton>
                    <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-chatwin__icon" onClick={onClose}>
                        <svg aria-hidden="true" viewBox="0 0 16 16">
                            <path d="M4 4 L12 12 M12 4 L4 12" />
                        </svg>
                    </BaseButton>
                </div>
                {filtersOpen && (
                    <div className="octane-handheld-chatwin__filters" data-testid="chat-window-filters">
                        <input
                            aria-label={localizeWithFallback('octane.room.search', 'Search')}
                            className="octane-handheld-chatwin__search"
                            placeholder={localizeWithFallback('octane.room.search', 'Search')}
                            type="search"
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                        />
                        <div className="octane-handheld-chatwin__chips">
                            <label className="octane-handheld-chatwin__check">
                                <Checkbox checked={hidePets} onCheckedChange={onHidePetsChange} />
                                <span>{LocalizeText('widget.room.chat.hide_pets')}</span>
                            </label>
                            <label className="octane-handheld-chatwin__check">
                                <Checkbox checked={hideAvatars} onCheckedChange={onHideAvatarsChange} />
                                <span>{LocalizeText('widget.room.chat.hide_avatars')}</span>
                            </label>
                            <BaseButton className="octane-handheld-chatwin__chip" onClick={onToggleBalloons}>
                                {hideBalloons ? LocalizeText('widget.room.chat.show_balloon') : LocalizeText('widget.room.chat.hide_balloon')}
                            </BaseButton>
                            <BaseButton className="octane-handheld-chatwin__chip is-danger" onClick={onClear}>
                                {LocalizeText('widget.room.chat.clear_history')}
                            </BaseButton>
                        </div>
                    </div>
                )}
            </NativeTextTree>
            <div className="octane-handheld-chatwin__body">
                <div ref={listRef} className="octane-handheld-chatwin__list" onScroll={onScroll}>
                    {children}
                </div>
                {showLatest && (
                    <BaseButton className="octane-handheld-chatwin__latest" onClick={onLatest}>
                        {localizeWithFallback('octane.handheld.chat_history.latest', 'Newest messages')}
                    </BaseButton>
                )}
            </div>
        </section>,
        target
    );
};

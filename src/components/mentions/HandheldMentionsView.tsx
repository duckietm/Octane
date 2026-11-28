import { FC, useState } from 'react';
import { FaSearch, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { formatMentionTime, IMentionEntry, LocalizeText, localizeWithFallback, MentionDateGroup, MentionType } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { MentionMessageView } from './MentionMessageView';

/** Why the list shows nothing: still loading, failed, filtered to nothing, or truly empty. */
export type HandheldMentionsEmpty = 'loading' | 'error' | 'noresults' | 'empty';

export interface HandheldMentionsFilter {
    key: string;
    label: string;
}

interface MentionCardProps {
    mention: IMentionEntry;
    ownUsername: string;
    onOpen: (mention: IMentionEntry) => void;
    onGoto: (mention: IMentionEntry) => void;
    onRemove: (mention: IMentionEntry) => void;
}

/**
 * One mention as a card: the sender's head and name, whether it was meant for the player or the room, the room and the
 * time, and the message. Tapping the card reads it (marks it read, as a desktop row click does) and shows the whole
 * message; "Go to room" and remove are buttons of their own.
 */
const MentionCard: FC<MentionCardProps> = ({ mention, ownUsername, onOpen, onGoto, onRemove }) => {
    const [expanded, setExpanded] = useState(false);
    const isRoom = mention.mentionType === MentionType.ROOM;
    const time = formatMentionTime(mention.timestamp);
    const removeLabel = LocalizeText('mentions.action.remove');

    return (
        <div
            className="octane-handheld-mentions__card"
            data-expanded={expanded || undefined}
            data-testid={`mention-${mention.mentionId}`}
            data-unread={!mention.read || undefined}
            role="listitem"
        >
            <BaseButton
                aria-expanded={expanded}
                aria-label={`${mention.senderUsername}: ${mention.message}`}
                className="octane-handheld-mentions__card-main"
                onClick={() => {
                    onOpen(mention);
                    setExpanded((value) => !value);
                }}
            >
                <span className="octane-handheld-mentions__avatar">
                    <LayoutAvatarImageView headOnly compactHead compactHeadPadding={0} compactHeadSize={40} direction={2} figure={mention.senderFigure} />
                </span>
                <span className="octane-handheld-mentions__card-body">
                    <span className="octane-handheld-mentions__card-head">
                        <span className="octane-handheld-mentions__name">{mention.senderUsername}</span>
                        <span className="octane-handheld-mentions__chip" data-kind={isRoom ? 'room' : 'direct'}>
                            {isRoom ? localizeWithFallback('mentions.chip.room', 'Room') : localizeWithFallback('mentions.chip.direct', 'Direct')}
                        </span>
                        {time.length > 0 && <span className="octane-handheld-mentions__time">{time}</span>}
                    </span>
                    {!!mention.roomName && <span className="octane-handheld-mentions__room">{mention.roomName}</span>}
                    <MentionMessageView className="octane-handheld-mentions__message" ownUsername={ownUsername} text={mention.message} />
                </span>
                {!mention.read && <span aria-hidden="true" className="octane-handheld-mentions__dot" />}
            </BaseButton>
            <div className="octane-handheld-mentions__card-actions">
                {mention.roomId > 0 && (
                    <BaseButton className="octane-handheld-mentions__goto" onClick={() => onGoto(mention)}>
                        {LocalizeText('mentions.action.goto')}
                    </BaseButton>
                )}
                <BaseButton aria-label={removeLabel} className="octane-handheld-mentions__remove" onClick={() => onRemove(mention)}>
                    <FaTrashAlt aria-hidden="true" />
                </BaseButton>
            </div>
        </div>
    );
};

export interface HandheldMentionsViewProps {
    title: string;
    unreadCount: number;
    filters: ReadonlyArray<HandheldMentionsFilter>;
    filter: string;
    onFilter: (key: string) => void;
    query: string;
    onQuery: (query: string) => void;
    groups: ReadonlyArray<{ key: MentionDateGroup; label: string; items: IMentionEntry[] }>;
    /** Why the list is empty, or null while it shows mentions. */
    empty: HandheldMentionsEmpty | null;
    isLoading: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    ownUsername: string;
    onOpen: (mention: IMentionEntry) => void;
    onGoto: (mention: IMentionEntry) => void;
    onRemove: (mention: IMentionEntry) => void;
    onMarkAll: () => void;
    onRefresh: () => void;
    onLoadMore: () => void;
    onClearFilters: () => void;
    onClose: () => void;
}

/**
 * The mentions on a phone, in the phone's own look (HandheldSheetFrame, HandheldMentions.css): the filters are the
 * sheet's tabs (the unread count on "Unread"), a search field, the mentions as cards under Today / Yesterday / Earlier,
 * and refresh and "mark all as read" in a bar at the bottom. MentionsView keeps every hook and hands it down.
 */
export const HandheldMentionsView: FC<HandheldMentionsViewProps> = ({
    title,
    unreadCount,
    filters,
    filter,
    onFilter,
    query,
    onQuery,
    groups,
    empty,
    isLoading,
    hasMore,
    loadingMore,
    ownUsername,
    onOpen,
    onGoto,
    onRemove,
    onMarkAll,
    onRefresh,
    onLoadMore,
    onClearFilters,
    onClose
}) => {
    const searchLabel = LocalizeText('generic.search');

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="mentions">
                <HandheldSheetFrame
                    activeTab={filter}
                    className="octane-handheld-mentions"
                    icon={unreadCount > 0 ? 'icon-mentions-unread' : 'icon-mentions'}
                    tabs={filters.map(({ key, label }) => ({ id: key, label, count: key === 'unread' ? unreadCount : 0 }))}
                    tabsLabel={LocalizeText('mentions.window.title')}
                    title={title}
                    onClose={onClose}
                    onTab={onFilter}
                >
                    <div className="octane-handheld-mentions__search">
                        <FaSearch aria-hidden="true" className="octane-handheld-mentions__search-icon" />
                        <input
                            aria-label={searchLabel}
                            className="octane-handheld-mentions__search-field"
                            placeholder={searchLabel}
                            type="search"
                            value={query}
                            onChange={(event) => onQuery(event.target.value)}
                        />
                        {query.length > 0 && (
                            <BaseButton
                                aria-label={localizeWithFallback('octane.handheld.mentions.search.clear', 'Clear the search')}
                                className="octane-handheld-mentions__search-clear"
                                onClick={() => onQuery('')}
                            >
                                <FaTimes aria-hidden="true" />
                            </BaseButton>
                        )}
                    </div>
                    <div aria-busy={isLoading} className="octane-handheld-mentions__list" data-testid="mentions-list" role="list">
                        {empty && (
                            <div className="octane-handheld-mentions__empty" data-empty={empty}>
                                <span aria-hidden="true" className="octane-handheld-mentions__empty-glyph" />
                                <span>
                                    {empty === 'loading'
                                        ? localizeWithFallback('mentions.window.loading', 'Loading mentions...')
                                        : empty === 'error'
                                          ? localizeWithFallback('mentions.window.error', 'The mentions could not be loaded.')
                                          : empty === 'noresults'
                                            ? localizeWithFallback('mentions.window.noresults', 'No mention matches.')
                                            : LocalizeText('mentions.window.empty')}
                                </span>
                                {empty === 'error' && (
                                    <BaseButton className="octane-handheld-mentions__button" onClick={onRefresh}>
                                        {localizeWithFallback('mentions.window.retry', 'Try again')}
                                    </BaseButton>
                                )}
                                {empty === 'noresults' && (
                                    <BaseButton className="octane-handheld-mentions__button" onClick={onClearFilters}>
                                        {localizeWithFallback('mentions.filter.clear', 'Clear the filters')}
                                    </BaseButton>
                                )}
                            </div>
                        )}
                        {groups.map((group) => (
                            <div key={group.key} className="octane-handheld-mentions__group" role="presentation">
                                <div className="octane-handheld-mentions__group-label" role="presentation">
                                    {group.label}
                                </div>
                                <div className="octane-handheld-mentions__cards" role="presentation">
                                    {group.items.map((mention) => (
                                        <MentionCard
                                            key={`${mention.mentionId}-${mention.timestamp}`}
                                            mention={mention}
                                            ownUsername={ownUsername}
                                            onGoto={onGoto}
                                            onOpen={onOpen}
                                            onRemove={onRemove}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        {hasMore && (
                            <BaseButton aria-busy={loadingMore} className="octane-handheld-mentions__more" disabled={loadingMore} onClick={onLoadMore}>
                                {loadingMore
                                    ? localizeWithFallback('mentions.window.loadingmore', 'Loading...')
                                    : localizeWithFallback('mentions.window.loadmore', 'Load older mentions')}
                            </BaseButton>
                        )}
                    </div>
                    <div className="octane-handheld-mentions__bar">
                        <BaseButton aria-busy={isLoading} className="octane-handheld-mentions__button" disabled={isLoading} onClick={onRefresh}>
                            {localizeWithFallback('mentions.action.refresh', 'Refresh')}
                        </BaseButton>
                        {unreadCount > 0 && (
                            <BaseButton className="octane-handheld-mentions__button is-primary" onClick={onMarkAll}>
                                {LocalizeText('mentions.window.markall')}
                            </BaseButton>
                        )}
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};

import { FC, useEffect, useMemo, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { getMentionDateGroup, IMentionEntry, LocalizeText, localizeWithFallback, MentionDateGroup, MentionType } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { requestMentions, useMentionActions, useMentionsSnapshot } from '../../hooks';
import { setMentionsPanelOpen } from '../../hooks/mentions/mentionsStore';
import { useUserDataSnapshot } from '../../hooks/session/useSessionSnapshots';
import { MentionRowView } from './MentionRowView';
import { BaseButton } from '../../common/BaseButton';

interface MentionsViewProps {
    onClose: () => void;
}

type MentionFilter = 'all' | 'unread' | 'direct' | 'room';

const FILTERS: ReadonlyArray<{ key: MentionFilter; label: string }> = [
    { key: 'all', label: 'mentions.filter.all' },
    { key: 'unread', label: 'mentions.filter.unread' },
    { key: 'direct', label: 'mentions.filter.direct' },
    { key: 'room', label: 'mentions.filter.room' }
];

const GROUP_ORDER: ReadonlyArray<MentionDateGroup> = ['today', 'yesterday', 'older'];
const GROUP_LABEL: Record<MentionDateGroup, string> = {
    today: 'mentions.group.today',
    yesterday: 'mentions.group.yesterday',
    older: 'mentions.group.older'
};

const matchesFilter = (mention: IMentionEntry, filter: MentionFilter): boolean => {
    switch (filter) {
        case 'unread':
            return !mention.read;
        case 'direct':
            return mention.mentionType === MentionType.DIRECT;
        case 'room':
            return mention.mentionType === MentionType.ROOM;
        default:
            return true;
    }
};

const matchesQuery = (mention: IMentionEntry, query: string): boolean => {
    if (!query) return true;

    const q = query.toLowerCase();

    return (
        (mention.senderUsername || '').toLowerCase().includes(q) ||
        (mention.roomName || '').toLowerCase().includes(q) ||
        (mention.message || '').toLowerCase().includes(q)
    );
};

export const MentionsView: FC<MentionsViewProps> = (props) => {
    const { onClose } = props;
    const { mentions, unreadCount, status } = useMentionsSnapshot();
    const { userName: ownUsername = '' } = useUserDataSnapshot();
    const { open, goto, remove, markAll } = useMentionActions();
    const [filter, setFilter] = useState<MentionFilter>('all');
    const [query, setQuery] = useState('');

    // While the panel is open a new mention lands in the list, so it needs no toast.
    useEffect(() => {
        setMentionsPanelOpen(true);

        return () => setMentionsPanelOpen(false);
    }, []);

    // The list is asked for once at startup; opening the panel only asks again when that never worked.
    useEffect(() => {
        if (status === 'idle' || status === 'error') requestMentions();
        // Only the state at the moment it opens matters here.
    }, []);

    const groups = useMemo(() => {
        const buckets: Record<MentionDateGroup, IMentionEntry[]> = { today: [], yesterday: [], older: [] };

        for (const mention of mentions) {
            if (!matchesFilter(mention, filter)) continue;
            if (!matchesQuery(mention, query)) continue;
            buckets[getMentionDateGroup(mention.timestamp)].push(mention);
        }

        return GROUP_ORDER.map((key) => ({ key, items: buckets[key] })).filter((group) => group.items.length > 0);
    }, [mentions, filter, query]);

    const isLoading = status === 'loading';
    const hasAny = groups.length > 0;
    const isFiltering = filter !== 'all' || query.length > 0;
    const title = `${LocalizeText('mentions.window.title')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`;

    const clearFilters = () => {
        setFilter('all');
        setQuery('');
    };

    const renderEmpty = () => {
        if (isLoading && mentions.length === 0) {
            return <span className="mentions-empty-text">{localizeWithFallback('mentions.window.loading', 'Loading mentions...')}</span>;
        }

        if (status === 'error' && mentions.length === 0) {
            return (
                <>
                    <span className="mentions-empty-text">{localizeWithFallback('mentions.window.error', 'The mentions could not be loaded.')}</span>
                    <BaseButton type="button" className="mentions-filter is-active" onClick={requestMentions}>
                        {localizeWithFallback('mentions.window.retry', 'Try again')}
                    </BaseButton>
                </>
            );
        }

        if (mentions.length > 0 && isFiltering) {
            return (
                <>
                    <span className="mentions-empty-text">{localizeWithFallback('mentions.window.noresults', 'No mention matches.')}</span>
                    <BaseButton type="button" className="mentions-filter is-active" onClick={clearFilters}>
                        {localizeWithFallback('mentions.filter.clear', 'Clear the filters')}
                    </BaseButton>
                </>
            );
        }

        return <span className="mentions-empty-text">{LocalizeText('mentions.window.empty')}</span>;
    };

    return (
        <OctaneCardView
            className="mentions-window min-w-0 w-[min(360px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] has-classic-scrollbar"
            theme="primary-slim"
            uniqueKey="mentions"
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
            <OctaneCardContentView gap={1}>
                <div className="mentions-search">
                    <FaSearch className="mentions-search-icon" />
                    <input
                        type="text"
                        value={query}
                        aria-label={LocalizeText('generic.search')}
                        placeholder={LocalizeText('generic.search')}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </div>
                <div className="mentions-toolbar">
                    <div className="mentions-filters" role="group" aria-label={LocalizeText('mentions.window.title')}>
                        {FILTERS.map(({ key, label }) => {
                            const active = filter === key;
                            const showCount = key === 'unread' && unreadCount > 0;

                            return (
                                <BaseButton key={key} type="button" aria-pressed={active} className={`mentions-filter ${active ? 'is-active' : ''}`} onClick={() => setFilter(key)}>
                                    {LocalizeText(label)}
                                    {showCount ? ` ${unreadCount}` : ''}
                                </BaseButton>
                            );
                        })}
                    </div>
                    <BaseButton type="button" className="mentions-refresh" disabled={isLoading} aria-busy={isLoading} onClick={requestMentions}>
                        {localizeWithFallback('mentions.action.refresh', 'Refresh')}
                    </BaseButton>
                </div>
                <div className="mentions-list" role="list" aria-busy={isLoading}>
                    {!hasAny && (
                        <div className="mentions-empty">
                            <span className="mentions-empty-glyph" aria-hidden />
                            {renderEmpty()}
                        </div>
                    )}
                    {hasAny &&
                        groups.map((group) => (
                            <div key={group.key} className="mentions-group">
                                <div className="mentions-group-label">{LocalizeText(GROUP_LABEL[group.key])}</div>
                                {group.items.map((mention) => (
                                    <MentionRowView key={`${mention.mentionId}-${mention.timestamp}`} mention={mention} onGoto={goto} onOpen={open} onRemove={remove} ownUsername={ownUsername} />
                                ))}
                            </div>
                        ))}
                </div>
                {unreadCount > 0 && (
                    <Button variant="primary" onClick={markAll}>
                        {LocalizeText('mentions.window.markall')}
                    </Button>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

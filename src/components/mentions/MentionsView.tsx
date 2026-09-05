import { MarkMentionsReadComposer, RequestMentionsComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaSearch, FaSync } from 'react-icons/fa';
import { getMentionDateGroup, IMentionEntry, LocalizeText, MentionDateGroup, MentionType, SendMessageComposer } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useMentionActions, useMentionsSnapshot } from '../../hooks';
import { markAllRead } from '../../hooks/mentions/mentionsStore';
import { useUserDataSnapshot } from '../../hooks/session/useSessionSnapshots';
import { MentionRowView } from './MentionRowView';

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
    const { mentions, unreadCount } = useMentionsSnapshot();
    const { userName: ownUsername = '' } = useUserDataSnapshot();
    const { open, goto, remove } = useMentionActions();
    const [filter, setFilter] = useState<MentionFilter>('all');
    const [query, setQuery] = useState('');

    // Re-request from the server: once on open, and on the manual refresh button.
    const refresh = useCallback(() => SendMessageComposer(new RequestMentionsComposer()), []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const onMarkAll = useCallback(() => {
        markAllRead();
        SendMessageComposer(new MarkMentionsReadComposer(0, 0));
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

    const hasAny = groups.length > 0;
    const title = `${LocalizeText('mentions.window.title')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`;

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
                    <input type="text" value={query} placeholder={LocalizeText('generic.search')} onChange={(event) => setQuery(event.target.value)} />
                </div>
                <div className="mentions-toolbar">
                    <div className="mentions-filters">
                        {FILTERS.map(({ key, label }) => {
                            const active = filter === key;
                            const showCount = key === 'unread' && unreadCount > 0;

                            return (
                                <button key={key} type="button" className={`mentions-filter ${active ? 'is-active' : ''}`} onClick={() => setFilter(key)}>
                                    {LocalizeText(label)}
                                    {showCount ? ` ${unreadCount}` : ''}
                                </button>
                            );
                        })}
                    </div>
                    <button type="button" className="mentions-refresh" title="Aggiorna" onClick={refresh}>
                        <FaSync />
                    </button>
                </div>
                <div className="mentions-list">
                    {!hasAny && (
                        <div className="mentions-empty">
                            <span className="mentions-empty-glyph">@</span>
                            <span className="mentions-empty-text">{LocalizeText('mentions.window.empty')}</span>
                        </div>
                    )}
                    {hasAny &&
                        groups.map((group) => (
                            <div key={group.key} className="mentions-group">
                                <div className="mentions-group-label">{LocalizeText(GROUP_LABEL[group.key])}</div>
                                {group.items.map((mention) => (
                                    <MentionRowView
                                        key={mention.mentionId}
                                        mention={mention}
                                        onGoto={goto}
                                        onOpen={open}
                                        onRemove={remove}
                                        ownUsername={ownUsername}
                                    />
                                ))}
                            </div>
                        ))}
                </div>
                {unreadCount > 0 && (
                    <Button variant="primary" onClick={onMarkAll}>
                        {LocalizeText('mentions.window.markall')}
                    </Button>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

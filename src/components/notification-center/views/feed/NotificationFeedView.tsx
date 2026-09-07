import { AddLinkEventTracker, ILinkEventTracker, MarkMentionsReadComposer, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAt, FaBell, FaBuilding, FaCheckDouble, FaCog, FaTrashAlt, FaUser, FaUserFriends } from 'react-icons/fa';
import { FriendlyTime, GetConfigurationValue, IMentionEntry, localizeWithFallback, OpenUrl, SanitizeHtml, SendMessageComposer } from '../../../../api';
import { NOTIFICATION_FEED_CATEGORIES, NotificationFeedCategory, NotificationFeedEntry, NotificationFeedPane, useNotificationFeed } from '../../../../hooks';
import { markAllRead as markAllMentionsRead } from '../../../../hooks/mentions/mentionsStore';
import { useMentionActions } from '../../../../hooks/mentions/useMentionActions';
import { useMentionsSnapshot } from '../../../../hooks/mentions/useMentionsSnapshot';
import { useUserDataSnapshot } from '../../../../hooks/session/useSessionSnapshots';
import { NotificationFeedMentionView } from './NotificationFeedMentionView';

/** Time-ago labels are refreshed on this cadence; a minute of drift is invisible in a feed. */
const CLOCK_TICK_MS = 30_000;
/** How long the folded tab flashes after a mention lands. */
const FLASH_MS = 2_500;

const CATEGORY_LABEL: Record<NotificationFeedCategory, { key: string; fallback: string }> = {
    mentions: { key: 'mentions.window.title', fallback: 'Mentions' },
    friends: { key: 'notifications.feed.category.friends', fallback: 'Friends' },
    me: { key: 'notifications.feed.category.me', fallback: 'Me' },
    hotel: { key: 'notifications.feed.category.hotel', fallback: 'Hotel' }
};

const CategoryIcon: FC<{ category: NotificationFeedCategory }> = ({ category }) => {
    switch (category) {
        case 'mentions':
            return <FaAt size={14} />;
        case 'friends':
            return <FaUserFriends size={14} />;
        case 'hotel':
            return <FaBuilding size={14} />;
        default:
            return <FaUser size={14} />;
    }
};

const FeedEntryView: FC<{ entry: NotificationFeedEntry; now: number }> = ({ entry, now }) => {
    const htmlText = (entry.message || '').replace(/\r\n|\r|\n/g, '<br />');
    const ageSeconds = Math.max(0, Math.floor((now - entry.receivedAt) / 1000));
    const clickable = !!entry.linkUrl;

    return (
        <div
            className={`flex items-start gap-2 rounded px-2 py-1.5 bg-white/5 border border-white/10 ${clickable ? 'cursor-pointer hover:bg-white/10' : ''}`}
            data-testid="feed-entry"
            onClick={() => clickable && OpenUrl(entry.linkUrl)}
        >
            <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-white/10 overflow-hidden">
                {entry.iconUrl ? <img alt="" className="max-w-full max-h-full" src={entry.iconUrl} /> : <CategoryIcon category={entry.category} />}
            </div>
            <div className="flex flex-col min-w-0 grow">
                {(entry.title || entry.senderName) && (
                    <span className="text-[.65rem] uppercase tracking-wide text-white/60 truncate">{entry.title || entry.senderName}</span>
                )}
                <span className="text-sm break-words" dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} />
                <span className="text-[.65rem] text-white/50">{FriendlyTime.format(ageSeconds, '.ago', 1)}</span>
            </div>
        </div>
    );
};

/** A stream row is either a feed entry or a mention; both sort by the moment they arrived. */
type StreamRow = { kind: 'entry'; at: number; entry: NotificationFeedEntry } | { kind: 'mention'; at: number; mention: IMentionEntry };

const mentionArrivedAt = (mention: IMentionEntry): number => (mention.timestamp > 0 ? mention.timestamp * 1000 : 0);

/**
 * The persistent notification feed of the official client (`feed_display_xml`): a panel
 * docked to the right edge above the toolbar, below the purse column so the purse menus
 * stay clickable, with a Notifications pane (the session history, newest first,
 * filtered by the settings), a Stream pane (everything in order, unfiltered) and a
 * Settings pane with one toggle per category. The mentions the server keeps for the
 * user are one of those categories, with the go-to-room and delete actions of the old
 * mentions window on each row. The transient bubbles keep showing as they do today;
 * every one of them also lands here.
 */
export const NotificationFeedView: FC<{}> = () => {
    const {
        entries,
        visibleEntries,
        settings,
        isOpen,
        pane,
        tabBottom,
        unreadCount,
        toggleCategory,
        setAllCategories,
        setOpen,
        toggleOpen,
        setPane,
        togglePane,
        setTabBottom,
        clearEntries
    } = useNotificationFeed();
    const { mentions, unreadCount: mentionsUnread } = useMentionsSnapshot();
    const { userName: ownUsername = '' } = useUserDataSnapshot();
    const mentionActions = useMentionActions();
    const mentionsEnabled = useMemo(() => GetConfigurationValue<boolean>('mentions_ui.enabled', true), []);
    const [settingsVisible, setSettingsVisible] = useState(false);
    // The folded tab can be dragged up and down the right edge; a press that never moves
    // more than a few pixels is a click and opens the panel.
    const dragRef = useRef<{ pointerId: number; startY: number; startBottom: number; moved: boolean } | null>(null);
    const onTabPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;

        dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startBottom: tabBottom, moved: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const onTabPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) return;

        const delta = drag.startY - event.clientY;

        if (!drag.moved && Math.abs(delta) < 4) return;

        drag.moved = true;
        setTabBottom(Math.min(window.innerHeight - 40, drag.startBottom + delta));
    };
    const onTabPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) return;

        dragRef.current = null;
        event.currentTarget.releasePointerCapture?.(event.pointerId);

        if (!drag.moved) setOpen(true);
    };
    const [now, setNow] = useState(() => Date.now());
    // A mention that arrives while the panel is folded makes the tab flash for a moment,
    // the way the old toolbar icon lit up.
    const [flash, setFlash] = useState(false);
    const lastMentionsUnreadRef = useRef(mentionsUnread);

    useEffect(() => {
        const previous = lastMentionsUnreadRef.current;

        lastMentionsUnreadRef.current = mentionsUnread;

        if (isOpen || mentionsUnread <= previous) return;

        setFlash(true);

        const handle = window.setTimeout(() => setFlash(false), FLASH_MS);

        return () => window.clearTimeout(handle);
    }, [mentionsUnread, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handle = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

        setNow(Date.now());

        return () => window.clearInterval(handle);
    }, [isOpen, entries]);

    useEffect(() => {
        const feedTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setOpen(true);
                        return;
                    case 'hide':
                        setOpen(false);
                        return;
                    case 'toggle':
                        toggleOpen();
                        return;
                }
            },
            eventUrlPrefix: 'notification-feed/'
        };
        // The mentions links the chat bubbles and the chat history send open the feed on
        // the Notifications pane, where the mentions section lives.
        const mentionsTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setOpen(true);
                        setPane('notifications');
                        return;
                    case 'hide':
                        setOpen(false);
                        return;
                    case 'toggle':
                        togglePane('notifications');
                        return;
                }
            },
            eventUrlPrefix: 'mentions/'
        };

        AddLinkEventTracker(feedTracker);
        AddLinkEventTracker(mentionsTracker);

        return () => {
            RemoveLinkEventTracker(feedTracker);
            RemoveLinkEventTracker(mentionsTracker);
        };
    }, [setOpen, toggleOpen, setPane, togglePane]);

    const markMentionsRead = () => {
        markAllMentionsRead();
        SendMessageComposer(new MarkMentionsReadComposer(0, 0));
    };

    const showMentions = mentionsEnabled && settings.mentions !== false;
    const sortedMentions = useMemo(() => [...mentions].sort((a, b) => b.timestamp - a.timestamp), [mentions]);

    // The Notifications pane keeps the official sections: one block per category, in the
    // order the AIR settings list them, each newest first.
    const sections = useMemo(
        () =>
            NOTIFICATION_FEED_CATEGORIES.map((category) => ({ category, entries: visibleEntries.filter((entry) => entry.category === category) })).filter(
                (section) => section.entries.length > 0 || (section.category === 'mentions' && showMentions && sortedMentions.length > 0)
            ),
        [visibleEntries, showMentions, sortedMentions]
    );
    const stream = useMemo<StreamRow[]>(() => {
        const rows: StreamRow[] = entries.map((entry) => ({ kind: 'entry', at: entry.receivedAt, entry }));

        if (mentionsEnabled) for (const mention of sortedMentions) rows.push({ kind: 'mention', at: mentionArrivedAt(mention), mention });

        return rows.sort((a, b) => b.at - a.at);
    }, [entries, sortedMentions, mentionsEnabled]);
    const categories = mentionsEnabled ? NOTIFICATION_FEED_CATEGORIES : NOTIFICATION_FEED_CATEGORIES.filter((category) => category !== 'mentions');
    const allVisible = categories.every((category) => settings[category]);
    const title = localizeWithFallback('notifications.feed.title', 'Notifications');
    const badgeCount = unreadCount + (mentionsEnabled ? mentionsUnread : 0);
    const panes: NotificationFeedPane[] = ['notifications', 'stream'];
    const paneLabel = (name: NotificationFeedPane) => localizeWithFallback(`notifications.feed.pane.${name}`, name === 'stream' ? 'Stream' : 'Notifications');
    const emptyText = (
        <div className="text-xs text-white/60 italic text-center py-6">{localizeWithFallback('notifications.feed.empty', 'Nothing has happened yet.')}</div>
    );
    const renderMention = (mention: IMentionEntry) => (
        <NotificationFeedMentionView
            key={`mention-${mention.mentionId}`}
            mention={mention}
            ownUsername={ownUsername}
            onGoto={mentionActions.goto}
            onOpen={mentionActions.open}
            onRemove={mentionActions.remove}
        />
    );

    if (!isOpen) {
        return (
            <button
                aria-label={title}
                className={`fixed right-0 z-20 pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-l bg-[#1c1c20f2] text-white border border-r-0 border-black/70 hover:bg-[#2a2a30f2] touch-none select-none cursor-grab active:cursor-grabbing ${flash ? 'animate-pulse ring-2 ring-amber-300' : ''}`}
                data-flash={flash ? 'true' : undefined}
                data-testid="feed-minimized"
                style={{ bottom: `${tabBottom}px` }}
                title={localizeWithFallback('notifications.feed.open', 'Open the notification feed')}
                type="button"
                onPointerCancel={onTabPointerUp}
                onPointerDown={onTabPointerDown}
                onPointerMove={onTabPointerMove}
                onPointerUp={onTabPointerUp}
            >
                <FaAngleDoubleLeft size={10} className="opacity-60" />
                <FaBell size={14} />
                {badgeCount > 0 && (
                    <span
                        className="inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-semibold"
                        data-testid="feed-unread"
                    >
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            className="fixed right-0 bottom-14 z-20 pointer-events-auto flex flex-col h-[min(440px,calc(100vh-200px))] w-[min(270px,calc(100vw-16px))] rounded-l bg-[#1c1c20f2] text-white border border-r-0 border-black/70 [box-shadow:inset_0_5px_#22222799,inset_0_-4px_#12121599]"
            data-testid="feed-panel"
        >
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10">
                <FaBell size={13} className="opacity-70" />
                <span className="font-semibold text-sm grow truncate">{title}</span>
                <button
                    aria-pressed={settingsVisible}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 ${settingsVisible ? 'bg-white/15' : ''}`}
                    title={localizeWithFallback('notifications.feed.settings', 'Settings')}
                    type="button"
                    onClick={() => setSettingsVisible((current) => !current)}
                >
                    <FaCog size={12} />
                </button>
                <button
                    className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-white/10"
                    title={localizeWithFallback('notifications.feed.minimize', 'Minimize')}
                    type="button"
                    onClick={() => setOpen(false)}
                >
                    <FaAngleDoubleRight size={12} />
                </button>
            </div>
            <div className="flex text-xs border-b border-white/10">
                {panes.map((name) => (
                    <button
                        key={name}
                        className={`grow py-1 ${pane === name ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'}`}
                        data-testid={`feed-pane-${name}`}
                        type="button"
                        onClick={() => setPane(name)}
                    >
                        {paneLabel(name)}
                    </button>
                ))}
            </div>
            <div className="relative grow min-h-0">
                <div className="absolute inset-0 overflow-y-auto flex flex-col gap-1.5 p-2">
                    {pane === 'notifications' &&
                        (sections.length === 0
                            ? emptyText
                            : sections.map((section) => (
                                  <div key={section.category} className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1 text-[.65rem] uppercase tracking-wide text-white/60 px-1">
                                          <CategoryIcon category={section.category} />
                                          <span className="grow">
                                              {localizeWithFallback(CATEGORY_LABEL[section.category].key, CATEGORY_LABEL[section.category].fallback)}
                                          </span>
                                          {section.category === 'mentions' && mentionsUnread > 0 && (
                                              <button
                                                  className="inline-flex items-center gap-1 normal-case tracking-normal rounded px-1 hover:bg-white/10"
                                                  data-testid="feed-mentions-markall"
                                                  title={localizeWithFallback('mentions.window.markall', 'Mark all as read')}
                                                  type="button"
                                                  onClick={markMentionsRead}
                                              >
                                                  <FaCheckDouble size={9} /> {mentionsUnread}
                                              </button>
                                          )}
                                      </div>
                                      {section.category === 'mentions' && showMentions && sortedMentions.map(renderMention)}
                                      {section.entries.map((entry) => (
                                          <FeedEntryView key={entry.id} entry={entry} now={now} />
                                      ))}
                                  </div>
                              )))}
                    {pane === 'stream' &&
                        (stream.length === 0
                            ? emptyText
                            : stream.map((row) =>
                                  row.kind === 'entry' ? <FeedEntryView key={row.entry.id} entry={row.entry} now={now} /> : renderMention(row.mention)
                              ))}
                </div>
                {settingsVisible && (
                    <div className="absolute inset-0 bg-[#1c1c20f2] flex flex-col gap-2 p-3" data-testid="feed-settings">
                        <div className="text-xs uppercase tracking-wide text-white/60">
                            {localizeWithFallback('notifications.feed.settings.show', 'Show in the feed')}
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                checked={allVisible}
                                className="form-check-input"
                                type="checkbox"
                                onChange={(event) => setAllCategories(event.target.checked)}
                            />
                            {localizeWithFallback('notifications.feed.settings.all', 'Everything')}
                        </label>
                        {categories.map((category) => (
                            <label key={category} className="flex items-center gap-2 text-sm cursor-pointer pl-4">
                                <input checked={!!settings[category]} className="form-check-input" type="checkbox" onChange={() => toggleCategory(category)} />
                                <CategoryIcon category={category} />
                                {localizeWithFallback(CATEGORY_LABEL[category].key, CATEGORY_LABEL[category].fallback)}
                            </label>
                        ))}
                        <button
                            className="mt-auto inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20"
                            disabled={!entries.length}
                            type="button"
                            onClick={clearEntries}
                        >
                            <FaTrashAlt size={10} /> {localizeWithFallback('notifications.feed.clear', 'Clear history')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

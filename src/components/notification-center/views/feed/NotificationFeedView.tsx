import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaBell, FaBuilding, FaCog, FaTrashAlt, FaUser, FaUserFriends } from 'react-icons/fa';
import { FriendlyTime, localizeWithFallback, OpenUrl, SanitizeHtml } from '../../../../api';
import { NOTIFICATION_FEED_CATEGORIES, NotificationFeedCategory, NotificationFeedEntry, useNotificationFeed } from '../../../../hooks';

type FeedPane = 'notifications' | 'stream';

/** Time-ago labels are refreshed on this cadence; a minute of drift is invisible in a feed. */
const CLOCK_TICK_MS = 30_000;

const CATEGORY_LABEL: Record<NotificationFeedCategory, { key: string; fallback: string }> = {
    friends: { key: 'notifications.feed.category.friends', fallback: 'Friends' },
    me: { key: 'notifications.feed.category.me', fallback: 'Me' },
    hotel: { key: 'notifications.feed.category.hotel', fallback: 'Hotel' }
};

const CategoryIcon: FC<{ category: NotificationFeedCategory }> = ({ category }) => {
    switch (category) {
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

/**
 * The persistent notification feed of the official client (`feed_display_xml`): a panel
 * docked to the right edge with a Notifications pane (the session history, newest first,
 * filtered by the settings), a Stream pane (everything in order, unfiltered) and a
 * Settings pane with one toggle per category. The transient bubbles keep showing as they
 * do today; every one of them also lands here.
 */
export const NotificationFeedView: FC<{}> = () => {
    const { entries, visibleEntries, settings, isOpen, unreadCount, toggleCategory, setAllCategories, setOpen, toggleOpen, clearEntries } =
        useNotificationFeed();
    const [pane, setPane] = useState<FeedPane>('notifications');
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!isOpen) return;

        const handle = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

        setNow(Date.now());

        return () => window.clearInterval(handle);
    }, [isOpen, entries]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
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

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setOpen, toggleOpen]);

    // The Notifications pane keeps the official sections: one block per category, in the
    // order the AIR settings list them, each newest first.
    const sections = useMemo(
        () =>
            NOTIFICATION_FEED_CATEGORIES.map((category) => ({ category, entries: visibleEntries.filter((entry) => entry.category === category) })).filter(
                (section) => section.entries.length > 0
            ),
        [visibleEntries]
    );
    const allVisible = NOTIFICATION_FEED_CATEGORIES.every((category) => settings[category]);
    const title = localizeWithFallback('notifications.feed.title', 'Notifications');

    if (!isOpen) {
        return (
            <button
                aria-label={title}
                className="fixed right-0 top-[45%] z-20 pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-l bg-[#1c1c20f2] text-white border border-r-0 border-black/70 hover:bg-[#2a2a30f2]"
                data-testid="feed-minimized"
                title={localizeWithFallback('notifications.feed.open', 'Open the notification feed')}
                type="button"
                onClick={() => setOpen(true)}
            >
                <FaAngleDoubleLeft size={10} className="opacity-60" />
                <FaBell size={14} />
                {unreadCount > 0 && (
                    <span
                        className="inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-semibold"
                        data-testid="feed-unread"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            className="fixed right-0 top-14 bottom-14 z-20 pointer-events-auto flex flex-col w-[min(270px,calc(100vw-16px))] rounded-l bg-[#1c1c20f2] text-white border border-r-0 border-black/70 [box-shadow:inset_0_5px_#22222799,inset_0_-4px_#12121599]"
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
                <button
                    className={`grow py-1 ${pane === 'notifications' ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'}`}
                    type="button"
                    onClick={() => setPane('notifications')}
                >
                    {localizeWithFallback('notifications.feed.pane.notifications', 'Notifications')}
                </button>
                <button
                    className={`grow py-1 ${pane === 'stream' ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'}`}
                    type="button"
                    onClick={() => setPane('stream')}
                >
                    {localizeWithFallback('notifications.feed.pane.stream', 'Stream')}
                </button>
            </div>
            <div className="relative grow min-h-0">
                <div className="absolute inset-0 overflow-y-auto flex flex-col gap-1.5 p-2">
                    {pane === 'notifications' &&
                        (sections.length === 0 ? (
                            <div className="text-xs text-white/60 italic text-center py-6">
                                {localizeWithFallback('notifications.feed.empty', 'Nothing has happened yet.')}
                            </div>
                        ) : (
                            sections.map((section) => (
                                <div key={section.category} className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1 text-[.65rem] uppercase tracking-wide text-white/60 px-1">
                                        <CategoryIcon category={section.category} />
                                        {localizeWithFallback(CATEGORY_LABEL[section.category].key, CATEGORY_LABEL[section.category].fallback)}
                                    </div>
                                    {section.entries.map((entry) => (
                                        <FeedEntryView key={entry.id} entry={entry} now={now} />
                                    ))}
                                </div>
                            ))
                        ))}
                    {pane === 'stream' &&
                        (entries.length === 0 ? (
                            <div className="text-xs text-white/60 italic text-center py-6">
                                {localizeWithFallback('notifications.feed.empty', 'Nothing has happened yet.')}
                            </div>
                        ) : (
                            entries.map((entry) => <FeedEntryView key={entry.id} entry={entry} now={now} />)
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
                        {NOTIFICATION_FEED_CATEGORIES.map((category) => (
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

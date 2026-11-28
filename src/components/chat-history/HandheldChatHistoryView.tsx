import { FC, RefObject, UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowDown, FaUserSlash } from 'react-icons/fa';
import { buildChatHistorySections, ChatEntryType, IChatEntry, localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ChatHistoryBubbleView } from './ChatHistoryBubbleView';

export interface HandheldChatHistoryViewProps {
    entries: ReadonlyArray<IChatEntry>;
    /** The scrolling list: ChatHistoryView scrolls it to the newest line, exactly as it does on the desktop. */
    scrollRef: RefObject<HTMLDivElement>;
    /** Whether a line offers "ignore" (ChatHistoryView's canIgnoreFromHistory). */
    canIgnore: (entry: IChatEntry) => boolean;
    onIgnore: (entry: IChatEntry) => void;
    onClose: () => void;
    /** On its side the rooms are listed in a column at the left. */
    landscape: boolean;
}

/** Farther than this from the end of the list, the "newest" button shows. */
const LATEST_SLACK = 160;

/**
 * The chat history on a phone, in the phone's own look (HandheldSheetFrame, HandheldChatHistory.css): a tall sheet over
 * the room that ends above the chat composer, so a player can read back and answer. Each room visit is a section with
 * the room's name as a sticky header; every line is the room's own chat bubble (head, name, style, whisper / shout looks),
 * its time beside it once a minute, and "ignore" as a button of its own. On its side the visited rooms are a column at
 * the left that scrolls to a room. ChatHistoryView keeps the history, the link tracker, the scrolling and the ignore
 * confirmation and hands them down.
 */
export const HandheldChatHistoryView: FC<HandheldChatHistoryViewProps> = ({ entries, scrollRef, canIgnore, onIgnore, onClose, landscape }) => {
    const sections = useMemo(() => buildChatHistorySections(entries), [entries]);
    const [awayFromEnd, setAwayFromEnd] = useState(false);
    const [currentSection, setCurrentSection] = useState<string | null>(null);
    const frameRef = useRef(0);

    useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

    const title = localizeWithFallback('room.chathistory.button.text', 'Chat history');
    const ignoreLabel = localizeWithFallback('chat.ignore_user.confirm.title', 'Ignore user');
    const earlierLabel = localizeWithFallback('octane.handheld.chat_history.earlier', 'Earlier');
    const latestLabel = localizeWithFallback('octane.handheld.chat_history.latest', 'Newest messages');
    const roomsLabel = localizeWithFallback('octane.handheld.chat_history.rooms', 'Rooms');

    const sectionAt = (scroller: HTMLElement): string | null => {
        let found: string | null = null;
        const top = scroller.scrollTop + 8;

        for (const element of scroller.querySelectorAll<HTMLElement>('[data-section]')) {
            if (element.offsetTop > top) break;
            found = element.dataset.section ?? null;
        }

        return found;
    };

    const onScroll = (event: UIEvent<HTMLDivElement>) => {
        const scroller = event.currentTarget;

        if (frameRef.current) return;

        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = 0;
            setAwayFromEnd(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > LATEST_SLACK);
            if (landscape) setCurrentSection(sectionAt(scroller));
        });
    };

    const scrollToLatest = () => {
        const scroller = scrollRef.current;

        if (scroller) scroller.scrollTo({ top: scroller.scrollHeight });
    };

    const scrollToSection = (key: string) => {
        const scroller = scrollRef.current;
        const section = scroller?.querySelector<HTMLElement>(`[data-section="${key}"]`);

        if (!scroller || !section) return;

        scroller.scrollTo({ top: section.offsetTop });
        setCurrentSection(key);
    };

    const activeSection = currentSection ?? sections[sections.length - 1]?.key ?? null;

    return (
        <NativeTextTree>
            <div className="octane-handheld-chat-history" data-landscape={landscape || undefined}>
                <HandheldSheetFrame className="octane-handheld-chat-history__sheet" icon="icon-chat-history" title={title} onClose={onClose}>
                    {landscape && sections.length > 0 && (
                        <nav aria-label={roomsLabel} className="octane-handheld-chat-history__rooms">
                            {sections.map((section) => (
                                <BaseButton
                                    key={section.key}
                                    aria-current={section.key === activeSection ? 'location' : undefined}
                                    className="octane-handheld-chat-history__room"
                                    onClick={() => scrollToSection(section.key)}
                                >
                                    <span aria-hidden="true" className="octane-icon icon-small-room" />
                                    <span className="octane-handheld-chat-history__room-name">{section.name ?? earlierLabel}</span>
                                    <span className="octane-handheld-chat-history__room-meta">{section.timestamp}</span>
                                </BaseButton>
                            ))}
                        </nav>
                    )}
                    <div className="octane-handheld-chat-history__pane">
                        <div ref={scrollRef} className="octane-handheld-chat-history__list" data-testid="chat-history-list" onScroll={onScroll}>
                            {sections.length === 0 && (
                                <div className="octane-handheld-chat-history__empty">
                                    <span aria-hidden="true" className="octane-icon icon-chat-history" />
                                    <span>{localizeWithFallback('octane.handheld.chat_history.empty', 'Nothing has been said yet.')}</span>
                                </div>
                            )}
                            {sections.map((section) => (
                                <section
                                    key={section.key}
                                    aria-label={section.name ?? earlierLabel}
                                    className="octane-handheld-chat-history__section"
                                    data-section={section.key}
                                >
                                    <header className="octane-handheld-chat-history__section-head" data-earlier={section.name === null || undefined}>
                                        <span aria-hidden="true" className="octane-icon icon-small-room" />
                                        <span className="octane-handheld-chat-history__section-name">{section.name ?? earlierLabel}</span>
                                        <span className="octane-handheld-chat-history__section-time">{section.timestamp}</span>
                                    </header>
                                    {section.rows.map(({ entry, index, showTime }) =>
                                        entry.type === ChatEntryType.TYPE_CHAT ? (
                                            <div key={`${entry.id}-${index}`} className="octane-handheld-chat-history__line" data-type={entry.chatType ?? 0}>
                                                <span className="octane-handheld-chat-history__time">{showTime ? entry.timestamp : ''}</span>
                                                <div className="octane-handheld-chat-history__bubble">
                                                    <ChatHistoryBubbleView entry={entry} />
                                                </div>
                                                {canIgnore(entry) ? (
                                                    <BaseButton
                                                        aria-label={`${ignoreLabel}: ${entry.name}`}
                                                        className="octane-handheld-chat-history__ignore"
                                                        onClick={() => onIgnore(entry)}
                                                    >
                                                        <FaUserSlash aria-hidden="true" />
                                                    </BaseButton>
                                                ) : (
                                                    <span aria-hidden="true" className="octane-handheld-chat-history__ignore-gap" />
                                                )}
                                            </div>
                                        ) : entry.type === ChatEntryType.TYPE_ROOM_INFO ? (
                                            <div key={`${entry.id}-${index}`} className="octane-handheld-chat-history__event">
                                                <span className="octane-handheld-chat-history__time">{showTime ? entry.timestamp : ''}</span>
                                                <span className="octane-handheld-chat-history__event-text">
                                                    <i aria-hidden="true" className="octane-icon icon-small-room" />
                                                    <span>{entry.message || entry.name}</span>
                                                </span>
                                            </div>
                                        ) : null
                                    )}
                                </section>
                            ))}
                        </div>
                        {awayFromEnd && (
                            <BaseButton aria-label={latestLabel} className="octane-handheld-chat-history__latest" onClick={scrollToLatest}>
                                <FaArrowDown aria-hidden="true" />
                            </BaseButton>
                        )}
                    </div>
                </HandheldSheetFrame>
            </div>
        </NativeTextTree>
    );
};

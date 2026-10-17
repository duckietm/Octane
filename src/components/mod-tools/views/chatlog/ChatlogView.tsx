import { ChatRecordData, CreateLinkEvent } from '@octane/renderer';
import { FC, Fragment, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, TryVisitRoom } from '../../../../api';
import { Column, InfiniteScroll } from '../../../../common';
import { useModTools } from '../../../../hooks';
import { ChatlogRecord } from './ChatlogRecord';
import messageIcon from '../../../../assets/images/mod-tools/send-message.png';
import roomVisitsIcon from '../../../../assets/images/mod-tools/room-visits.png';
import { BaseButton } from '../../../../common/BaseButton';

interface ChatlogViewProps {
    records: ChatRecordData[];
    /** Opens already filtered - a user's own chatlog is only ever read for that user. */
    initialQuery?: string;
}

/**
 * Keeps the rows a moderator is looking for, and the room heading above each surviving
 * group. Filtering the flat list on its own would leave headings for rooms that matched
 * nothing, so a heading is only emitted once something under it survives.
 */
export const filterChatlogRecords = (records: ChatlogRecord[], query: string): ChatlogRecord[] => {
    const needle = query.trim().toLowerCase();

    if (!needle.length) return records;

    const results: ChatlogRecord[] = [];
    let pendingRoom: ChatlogRecord = null;

    for (const record of records) {
        if (record.isRoomInfo) {
            pendingRoom = record;
            continue;
        }

        const matches =
            (record.message ?? '').toLowerCase().includes(needle) ||
            (record.username ?? '').toLowerCase().includes(needle);

        if (!matches) continue;

        if (pendingRoom) {
            results.push(pendingRoom);
            pendingRoom = null;
        }

        results.push(record);
    }

    return results;
};

export const ChatlogView: FC<ChatlogViewProps> = (props) => {
    const { records = null, initialQuery = '' } = props;
    const { openRoomInfo = null } = useModTools();
    const [query, setQuery] = useState(initialQuery);

    const allRecords = useMemo(() => {
        const results: ChatlogRecord[] = [];

        records.forEach((record) => {
            results.push({
                isRoomInfo: true,
                roomId: record.roomId,
                roomName: record.roomName ?? '',
                recordType: record.recordType,
                groupId: record.groupId
            });

            record.chatlog.forEach((chatlog) => {
                results.push({
                    timestamp: chatlog.timestamp,
                    habboId: chatlog.userId,
                    username: chatlog.userName,
                    hasHighlighting: chatlog.hasHighlighting,
                    message: chatlog.message,
                    isRoomInfo: false
                });
            });
        });

        return results;
    }, [records]);

    const totalMessages = useMemo(() => allRecords.filter((r) => !r.isRoomInfo).length, [allRecords]);

    const visibleRecords = useMemo(() => filterChatlogRecords(allRecords, query), [allRecords, query]);

    const matchCount = useMemo(() => visibleRecords.filter((r) => !r.isRoomInfo).length, [visibleRecords]);
    const isFiltering = query.trim().length > 0;

    // The match is what the moderator is looking for; the rest is context.
    const highlight = (text: string) => {
        const needle = query.trim();

        if (!needle.length || !text) return text;

        const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

        return parts.map((part, index) =>
            part.toLowerCase() === needle.toLowerCase()
                ? <mark key={index} className="bg-amber-200 text-inherit rounded-[2px] px-[1px]">{part}</mark>
                : <Fragment key={index}>{part}</Fragment>
        );
    };

    const headerButtonClass = 'octane-mod-tools-button';

    // IM, forum and photo evidence has no room to visit, so the heading follows the record type.
    const RecordHeader = (props: { record: ChatlogRecord }) => {
        const { roomId = 0, roomName = '', recordType = ChatRecordData.TYPE_ROOM_CHAT, groupId = 0 } = props.record;
        const hasRoom = roomId > 0;
        const roomLabel = roomName || (hasRoom ? `#${roomId}` : '');
        let icon = <img alt="" className="octane-mod-tools-header-icon" src={roomVisitsIcon} />;
        let title = roomLabel;

        switch (recordType) {
            case ChatRecordData.TYPE_IM_SESSION:
                icon = <img alt="" className="octane-mod-tools-header-icon" src={messageIcon} />;
                title = localizeWithFallback('modtools.chatlog.context.im', 'IM session');
                break;
            case ChatRecordData.TYPE_DISCUSSION_THREAD:
            case ChatRecordData.TYPE_DISCUSSION_MESSAGE:
                icon = null;
                title = (recordType === ChatRecordData.TYPE_DISCUSSION_THREAD)
                    ? localizeWithFallback('modtools.chatlog.context.forum_thread', 'Forum thread')
                    : localizeWithFallback('modtools.chatlog.context.forum_message', 'Forum message');
                break;
            case ChatRecordData.TYPE_SELFIE:
            case ChatRecordData.TYPE_PHOTO: {
                icon = null;
                const label = (recordType === ChatRecordData.TYPE_SELFIE)
                    ? localizeWithFallback('modtools.chatlog.context.selfie', 'Selfie report')
                    : localizeWithFallback('modtools.chatlog.context.photo', 'Photo report');
                title = roomLabel ? `${label}: ${roomLabel}` : label;
                break;
            }
            default:
                if (!hasRoom && !roomName) return null;
        }

        const isRoomRecord = (recordType === ChatRecordData.TYPE_ROOM_CHAT) || (recordType === ChatRecordData.TYPE_SIMPLE);
        const showRoomTools = hasRoom && (isRoomRecord || (recordType === ChatRecordData.TYPE_SELFIE) || (recordType === ChatRecordData.TYPE_PHOTO));
        const isForum = (recordType === ChatRecordData.TYPE_DISCUSSION_THREAD) || (recordType === ChatRecordData.TYPE_DISCUSSION_MESSAGE);

        return (
            <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-transparent rounded p-2 border border-sky-100 my-1">
                {icon}
                <div className="font-semibold leading-tight grow truncate">{title}</div>
                <div className="flex gap-1 shrink-0">
                    {hasRoom && isRoomRecord && (
                        <BaseButton className={headerButtonClass} onClick={() => TryVisitRoom(roomId)}>
                            <img alt="" className="octane-mod-tools-button-icon" src={roomVisitsIcon} /> {LocalizeText('modtools.chatlog.visit')}
                        </BaseButton>
                    )}
                    {showRoomTools && (
                        <BaseButton className={headerButtonClass} onClick={() => openRoomInfo(roomId)}>
                            {LocalizeText('modtools.chatlog.tools')}
                        </BaseButton>
                    )}
                    {isForum && (groupId > 0) && (
                        <BaseButton className={headerButtonClass} onClick={() => CreateLinkEvent(`groupforum/${groupId}`)}>
                            {localizeWithFallback('modtools.chatlog.open_forum', 'Open forum')}
                        </BaseButton>
                    )}
                </div>
            </div>
        );
    };

    const isEmpty = !records || records.length === 0 || totalMessages === 0;

    return (
        <Column fit gap={0} overflow="hidden">
            <div className="flex items-center gap-1 pb-1.5">
                <div className="relative grow min-w-0">
                    <input
                        className="w-full"
                        type="text"
                        value={query}
                        placeholder={LocalizeText('generic.search')}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    {isFiltering && <BaseButton
                        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-4 h-4"
                        type="button"
                        title={LocalizeText('generic.cancel')}
                        onClick={() => setQuery('')}
                    >
                        ×
                    </BaseButton>}
                </div>
                <span className="text-[.65rem] opacity-60 shrink-0 tabular-nums">
                    {isFiltering ? `${matchCount}/${totalMessages}` : totalMessages}
                    
                </span>
            </div>
            <div className="min-w-0 overflow-x-auto">
                <div className="min-w-[360px]">
                    {/* Column headers */}
                    <div className="grid grid-cols-[84px_120px_1fr] gap-2 text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                        <div>{LocalizeText('modtools.chatlog.column.time')}</div>
                        <div>{LocalizeText('modtools.chatlog.column.user')}</div>
                        <div>{LocalizeText('modtools.chatlog.column.message')}</div>
                    </div>
                    {!isEmpty && isFiltering && !matchCount ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-6 opacity-50 text-sm">
                            
                            <span>{LocalizeText('generic.no_results_found')}</span>
                        </div>
                    ) : isEmpty ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-6 opacity-50 text-sm">
                            
                            <span>{LocalizeText('modtools.chatlog.empty')}</span>
                        </div>
                    ) : (
                        <div className="octane-mod-tools-list">
                        <InfiniteScroll
                            rowRender={(row: ChatlogRecord) => {
                                if (row.isRoomInfo) return <RecordHeader record={row} />;

                                return (
                                    <div
                                        className={`grid grid-cols-[84px_120px_1fr] gap-2 items-start px-1 py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02] hover:bg-sky-50/50 transition-colors ${row.hasHighlighting ? 'bg-amber-50/60' : ''}`}
                                    >
                                        <span className="font-mono text-[.7rem] opacity-70 tabular-nums whitespace-nowrap">{row.timestamp}</span>
                                        <BaseButton
                                            className="text-left font-semibold text-sky-700 hover:text-sky-900 hover:underline truncate"
                                            onClick={() => CreateLinkEvent(`mod-tools/open-user-info/${row.habboId}`)}
                                        >
                                            {highlight(row.username)}
                                        </BaseButton>
                                        <span className="break-words">{highlight(row.message)}</span>
                                    </div>
                                );
                            }}
                            rows={visibleRecords}
                        />
                        </div>
                    )}
                </div>
            </div>
        </Column>
    );
};

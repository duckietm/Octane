import { GetRoomVisitsMessageComposer, RoomVisitsData, RoomVisitsEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaClock, FaDoorOpen, FaSignInAlt } from 'react-icons/fa';
import { LocalizeText, SendMessageComposer, TryVisitRoom } from '../../../../api';
import { DraggableWindowPosition, InfiniteScroll, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';

interface ModToolsUserRoomVisitsViewProps {
    userId: number;
    onCloseClick: () => void;
}

export const ModToolsUserRoomVisitsView: FC<ModToolsUserRoomVisitsViewProps> = (props) => {
    const { userId = null, onCloseClick = null } = props;
    const [roomVisitData, setRoomVisitData] = useState<RoomVisitsData>(null);

    useMessageEvent<RoomVisitsEvent>(RoomVisitsEvent, (event) => {
        const parser = event.getParser();

        if (parser.data.userId !== userId) return;

        setRoomVisitData(parser.data);
    });

    useEffect(() => {
        SendMessageComposer(new GetRoomVisitsMessageComposer(userId));
    }, [userId]);

    if (!userId) return null;

    const rows = roomVisitData?.rooms ?? [];
    const isEmpty = rows.length === 0;

    const countLabel =
        rows.length === 1
            ? LocalizeText('modtools.user.visits.entries.one', ['count'], [rows.length.toString()])
            : LocalizeText('modtools.user.visits.entries.many', ['count'], [rows.length.toString()]);

    return (
        <OctaneCardView
            className="octane-mod-tools-user-visits min-w-0 w-[min(460px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView headerText={LocalizeText('modtools.user.visits.title')} onCloseClick={onCloseClick} />
            <OctaneCardContentView className="text-black" gap={1}>
                {/* Header strip */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-transparent rounded p-2 border border-sky-100">
                    <FaDoorOpen className="text-sky-600 shrink-0" size={14} />
                    <div className="text-sm font-semibold leading-tight grow">{LocalizeText('modtools.user.visits.recent')}</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-white border-zinc-200">{countLabel}</span>
                </div>

                <div className="min-w-0 overflow-x-auto">
                    <div className="min-w-[280px]">
                        {/* Table head */}
                        <div className="grid grid-cols-[60px_1fr_80px] gap-2 text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                            <div className="flex items-center gap-1">
                                <FaClock size={10} /> {LocalizeText('modtools.user.visits.time')}
                            </div>
                            <div>{LocalizeText('modtools.user.visits.room')}</div>
                            <div className="text-right">{LocalizeText('modtools.user.visits.action')}</div>
                        </div>

                        {/* Rows */}
                        {isEmpty ? (
                            <div className="flex flex-col items-center justify-center gap-1 py-6 opacity-50 text-sm">
                                <FaDoorOpen size={22} />
                                <span>{LocalizeText('modtools.user.visits.empty')}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col grow min-h-0 overflow-hidden">
                                <InfiniteScroll
                                    rowRender={(row) => (
                                        <div className="grid grid-cols-[60px_1fr_80px] gap-2 items-center px-1 py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02] hover:bg-sky-50 transition-colors">
                                            <span className="font-mono text-[.75rem] opacity-70 tabular-nums">
                                                {row.enterHour.toString().padStart(2, '0')}:{row.enterMinute.toString().padStart(2, '0')}
                                            </span>
                                            <span className="truncate font-medium">{row.roomName}</span>
                                            <button
                                                className="inline-flex items-center justify-end gap-1 text-sky-700 hover:text-sky-900 hover:underline text-xs"
                                                onClick={() => TryVisitRoom(row.roomId)}
                                                title={LocalizeText('modtools.user.visits.visit.title')}
                                            >
                                                <FaSignInAlt size={10} /> {LocalizeText('modtools.user.visits.visit')}
                                            </button>
                                        </div>
                                    )}
                                    rows={rows}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

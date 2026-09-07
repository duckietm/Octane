import {
    CreateLinkEvent,
    GetModeratorRoomInfoMessageComposer,
    ModerateRoomMessageComposer,
    ModeratorActionMessageComposer,
    ModeratorRoomInfoEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaBullhorn, FaCommentDots, FaDoorOpen, FaExclamationTriangle, FaSignInAlt, FaSync, FaUserShield, FaUsers } from 'react-icons/fa';
import { LocalizeText, SendMessageComposer, TryVisitRoom } from '../../../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';

interface ModToolsRoomViewProps {
    roomId: number;
    onCloseClick: () => void;
}

export const ModToolsRoomView: FC<ModToolsRoomViewProps> = (props) => {
    const { roomId = null, onCloseClick = null } = props;
    const [infoRequested, setInfoRequested] = useState(false);
    const [loadedRoomId, setLoadedRoomId] = useState(null);
    const [name, setName] = useState(null);
    const [ownerId, setOwnerId] = useState(null);
    const [ownerName, setOwnerName] = useState(null);
    const [ownerInRoom, setOwnerInRoom] = useState(false);
    const [usersInRoom, setUsersInRoom] = useState(0);
    const [kickUsers, setKickUsers] = useState(false);
    const [lockRoom, setLockRoom] = useState(false);
    const [changeRoomName, setChangeRoomName] = useState(false);
    const [message, setMessage] = useState('');

    const refresh = () => SendMessageComposer(new GetModeratorRoomInfoMessageComposer(roomId));

    const handleClick = (action: string) => {
        if (!action) return;

        switch (action) {
            case 'alert_only':
                if (message.trim().length === 0) return;

                SendMessageComposer(new ModeratorActionMessageComposer(ModeratorActionMessageComposer.ACTION_ALERT, message, ''));
                SendMessageComposer(new ModerateRoomMessageComposer(roomId, lockRoom ? 1 : 0, changeRoomName ? 1 : 0, kickUsers ? 1 : 0));
                return;
            case 'send_message':
                if (message.trim().length === 0) return;

                SendMessageComposer(new ModeratorActionMessageComposer(ModeratorActionMessageComposer.ACTION_MESSAGE, message, ''));
                SendMessageComposer(new ModerateRoomMessageComposer(roomId, lockRoom ? 1 : 0, changeRoomName ? 1 : 0, kickUsers ? 1 : 0));
                return;
        }
    };

    useMessageEvent<ModeratorRoomInfoEvent>(ModeratorRoomInfoEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.data.flatId !== roomId) return;

        setLoadedRoomId(parser.data.flatId);
        setName(parser.data.room.name);
        setOwnerId(parser.data.ownerId);
        setOwnerName(parser.data.ownerName);
        setOwnerInRoom(parser.data.ownerInRoom);
        setUsersInRoom(parser.data.userCount);
    });

    useEffect(() => {
        if (infoRequested) return;

        SendMessageComposer(new GetModeratorRoomInfoMessageComposer(roomId));
        setInfoRequested(true);
    }, [roomId, infoRequested]);

    const isLoaded = loadedRoomId !== null;
    const hasMessage = message.trim().length > 0;
    const ownerPillClass = ownerInRoom ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200';
    const ownerDotClass = ownerInRoom ? 'bg-emerald-500' : 'bg-zinc-400';

    return (
        <OctaneCardView
            className="octane-mod-tools-room min-w-0 w-[min(460px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView headerText={LocalizeText('modtools.roominfo.title')} onCloseClick={() => onCloseClick()} />
            <OctaneCardContentView className="text-black" gap={2}>
                {/* Identity header */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-transparent rounded p-2 border border-sky-100">
                    <FaDoorOpen className="text-sky-600 shrink-0" size={16} />
                    <div className="flex flex-col grow min-w-0">
                        <Text bold className="truncate text-base leading-tight">
                            {name || LocalizeText('modtools.roominfo.loading')}
                        </Text>
                        <Text className="opacity-60 text-xs truncate">#{roomId}</Text>
                    </div>
                    <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${ownerPillClass}`}
                        title={ownerInRoom ? LocalizeText('modtools.roominfo.owner.title.here') : LocalizeText('modtools.roominfo.owner.title.away')}
                    >
                        <span className={`inline-block w-2 h-2 rounded-full ${ownerDotClass}`} />
                        {ownerInRoom ? LocalizeText('modtools.roominfo.owner.here') : LocalizeText('modtools.roominfo.owner.away')}
                    </span>
                    <button
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-500 hover:text-sky-700 hover:bg-sky-100 transition-colors shrink-0"
                        onClick={refresh}
                        title={LocalizeText('modtools.roominfo.refresh')}
                    >
                        <FaSync size={12} />
                    </button>
                </div>

                {/* Stat strip */}
                <div className="flex gap-1.5">
                    <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded border bg-sky-50 border-sky-200 text-sky-700 grow min-w-0">
                        <div className="flex items-center gap-1.5 text-[.7rem] uppercase tracking-wide opacity-70">
                            <FaUsers size={10} />
                            <span>{LocalizeText('modtools.roominfo.stat.users')}</span>
                        </div>
                        <div className="text-lg font-semibold tabular-nums leading-tight">{usersInRoom}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded border bg-zinc-50 border-zinc-200 text-zinc-700 grow min-w-0">
                        <div className="flex items-center gap-1.5 text-[.7rem] uppercase tracking-wide opacity-70">
                            <FaUserShield size={10} />
                            <span>{LocalizeText('modtools.roominfo.stat.owner')}</span>
                        </div>
                        <div
                            className="text-sm font-semibold leading-tight truncate max-w-full underline cursor-pointer hover:text-sky-700"
                            onClick={() => ownerId && CreateLinkEvent(`mod-tools/open-user-info/${ownerId}`)}
                            title={ownerName ? LocalizeText('modtools.roominfo.owner.open', ['username'], [ownerName]) : ''}
                        >
                            {ownerName || '-'}
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-1.5">
                    <Button gap={1} variant="secondary" onClick={() => TryVisitRoom(roomId)}>
                        <FaSignInAlt size={12} /> {LocalizeText('modtools.roominfo.button.visit')}
                    </Button>
                    <Button gap={1} variant="secondary" onClick={() => CreateLinkEvent(`mod-tools/open-room-chatlog/${roomId}`)}>
                        <FaCommentDots size={12} /> {LocalizeText('modtools.roominfo.button.chatlog')}
                    </Button>
                </div>

                {/* Moderate panel */}
                <div className="flex flex-col gap-1.5 bg-amber-50 border border-amber-200 rounded p-2">
                    <div className="flex items-center gap-1.5 text-[.7rem] uppercase tracking-wide font-semibold text-amber-800">
                        <FaExclamationTriangle size={10} /> {LocalizeText('modtools.roominfo.moderate.title')}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input checked={kickUsers} className="form-check-input" type="checkbox" onChange={(event) => setKickUsers(event.target.checked)} />
                        <span>{LocalizeText('modtools.roominfo.moderate.kick')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input checked={lockRoom} className="form-check-input" type="checkbox" onChange={(event) => setLockRoom(event.target.checked)} />
                        <span>{LocalizeText('modtools.roominfo.moderate.doorbell')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            checked={changeRoomName}
                            className="form-check-input"
                            type="checkbox"
                            onChange={(event) => setChangeRoomName(event.target.checked)}
                        />
                        <span>{LocalizeText('modtools.roominfo.moderate.rename')}</span>
                    </label>
                    <textarea
                        className="min-h-[60px] px-2 py-1.5 rounded text-sm border border-amber-300 bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder={LocalizeText('modtools.roominfo.moderate.message.placeholder')}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                    <div className="flex gap-1.5">
                        <Button className="grow" disabled={!hasMessage || !isLoaded} gap={1} variant="danger" onClick={() => handleClick('send_message')}>
                            <FaBullhorn size={12} /> {LocalizeText('modtools.roominfo.moderate.send.caution')}
                        </Button>
                        <Button className="grow" disabled={!hasMessage || !isLoaded} gap={1} variant="warning" onClick={() => handleClick('alert_only')}>
                            <FaExclamationTriangle size={12} /> {LocalizeText('modtools.roominfo.moderate.send.alert')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

import {
    CreateLinkEvent,
    GetModeratorRoomInfoMessageComposer,
    ModerateRoomMessageComposer,
    ModeratorActionMessageComposer,
    ModeratorRoomInfoEvent
} from '@octane/renderer';
import chatIcon from '../../../../assets/images/mod-tools/chatlog.png';
import roomVisitsIcon from '../../../../assets/images/mod-tools/room-visits.png';
import warningIcon from '../../../../assets/images/mod-tools/warning.png';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, SendMessageComposer, TryVisitRoom } from '../../../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent, useModTools } from '../../../../hooks';
import { ModToolsTemplateSelectView } from '../ModToolsTemplateSelectView';
import { Checkbox } from '../../../../common/Checkbox';
import { BaseButton } from '../../../../common/BaseButton';

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
    const { settings = null } = useModTools();

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
            className="octane-mod-tools-room w-max min-w-[min(440px,calc(100vw-16px))] max-w-[min(760px,calc(100vw-16px))] min-h-[min(460px,calc(100vh-16px))] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView headerText={LocalizeText('modtools.roominfo.title')} onCloseClick={() => onCloseClick()} />
            <OctaneCardContentView className="text-black" gap={2}>
                {/* Identity header */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-transparent rounded p-2 border border-sky-100">
                    <img alt="" className="octane-mod-tools-header-icon" src={roomVisitsIcon} />
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
                    <BaseButton
                        className="octane-mod-tools-refresh"
                        onClick={refresh}
                        title={LocalizeText('modtools.roominfo.refresh')}
                    >
                        {LocalizeText('modtools.roominfo.refresh')}
                    </BaseButton>
                </div>

                {/* Stat strip */}
                <div className="flex gap-1.5">
                    <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded border bg-sky-50 border-sky-200 text-sky-700 grow min-w-0">
                        <div className="flex items-center gap-1.5 text-[.7rem] uppercase tracking-wide opacity-70">
                            
                            <span>{LocalizeText('modtools.roominfo.stat.users')}</span>
                        </div>
                        <div className="text-lg font-semibold tabular-nums leading-tight">{usersInRoom}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded border bg-zinc-50 border-zinc-200 text-zinc-700 grow min-w-0">
                        <div className="flex items-center gap-1.5 text-[.7rem] uppercase tracking-wide opacity-70">
                            
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
                        <img alt="" className="octane-mod-tools-button-icon" src={roomVisitsIcon} /> {LocalizeText('modtools.roominfo.button.visit')}
                    </Button>
                    <Button gap={1} variant="secondary" onClick={() => CreateLinkEvent(`mod-tools/open-room-chatlog/${roomId}`)}>
                        <img alt="" className="octane-mod-tools-button-icon" src={chatIcon} /> {LocalizeText('modtools.roominfo.button.chatlog')}
                    </Button>
                </div>

                {/* Moderate panel */}
                <div className="flex flex-col gap-1.5 bg-amber-50 border border-amber-200 rounded p-2">
                    <div className="flex items-center gap-1.5 text-[.7rem] uppercase tracking-wide font-semibold text-amber-800">
                        <img alt="" className="octane-mod-tools-button-icon" src={warningIcon} /> {LocalizeText('modtools.roominfo.moderate.title')}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={kickUsers} onCheckedChange={(nextChecked) => setKickUsers(nextChecked)} />
                        <span>{LocalizeText('modtools.roominfo.moderate.kick')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={lockRoom} onCheckedChange={(nextChecked) => setLockRoom(nextChecked)} />
                        <span>{LocalizeText('modtools.roominfo.moderate.doorbell')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={changeRoomName} onCheckedChange={(nextChecked) => setChangeRoomName(nextChecked)} />
                        <span>{LocalizeText('modtools.roominfo.moderate.rename')}</span>
                    </label>
                    <ModToolsTemplateSelectView templates={settings?.roomMessageTemplates} onSelect={setMessage} />
                    <textarea
                        className="min-h-[60px] px-2 py-1.5 rounded text-sm border border-amber-300 bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder={LocalizeText('modtools.roominfo.moderate.message.placeholder')}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                    <div className="flex gap-1.5">
                        <Button className="grow" disabled={!hasMessage || !isLoaded} gap={1} variant="danger" onClick={() => handleClick('send_message')}>
                            {LocalizeText('modtools.roominfo.moderate.send.caution')}
                        </Button>
                        <Button className="grow" disabled={!hasMessage || !isLoaded} gap={1} variant="warning" onClick={() => handleClick('alert_only')}>
                            <img alt="" className="octane-mod-tools-button-icon" src={warningIcon} /> {LocalizeText('modtools.roominfo.moderate.send.alert')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

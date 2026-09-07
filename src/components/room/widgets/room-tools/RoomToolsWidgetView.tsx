import { CreateLinkEvent, GetGuestRoomResultEvent, GetRoomEngine, RateFlatMessageComposer, RoomEngineEvent, RoomGeometry } from '@octane/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, SendMessageComposer, SetLocalStorage, TryVisitRoom } from '../../../../api';
import { Text } from '../../../../common';
import { useMessageEvent, useNavigatorData, useOctaneEvent, useRoom } from '../../../../hooks';
import { classNames } from '../../../../layout';
import { getRegisteredPlugins, IOctanePlugin, subscribePlugins } from '../../../plugins/OctanePluginApi';
import { applyRoomZoom } from './roomZoom.helpers';

interface RoomHistoryEntry {
    roomId: number;
    roomName: string;
}

const ROOM_HISTORY_KEY = 'nitro.room.history';
const ROOM_HISTORY_MAX = 10;
const ROOM_NAME_MAX = 80;
const ROOM_ZOOM_SCALES = [0.5, 1, 2, 4, 8, 16];

const readRoomHistory = (): RoomHistoryEntry[] => {
    try {
        const raw = window.localStorage.getItem(ROOM_HISTORY_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((entry) => entry && Number.isInteger(entry.roomId) && entry.roomId > 0 && typeof entry.roomName === 'string')
            .slice(-ROOM_HISTORY_MAX)
            .map((entry) => ({ roomId: entry.roomId, roomName: entry.roomName.slice(0, ROOM_NAME_MAX) }));
    } catch {
        return [];
    }
};

const getNearestZoomScale = (scale: number) => {
    if (Number.isNaN(scale) || scale <= 0) return 1;

    return ROOM_ZOOM_SCALES.reduce((nearest, current) => (Math.abs(current - scale) < Math.abs(nearest - scale) ? current : nearest), ROOM_ZOOM_SCALES[0]);
};

const getNextZoomScale = (scale: number, direction: number) => {
    const currentScale = getNearestZoomScale(scale);

    if (direction > 0) {
        return ROOM_ZOOM_SCALES.find((zoomScale) => zoomScale > currentScale + 0.001) ?? currentScale;
    }

    if (direction < 0) {
        return [...ROOM_ZOOM_SCALES].reverse().find((zoomScale) => zoomScale < currentScale - 0.001) ?? currentScale;
    }

    return currentScale;
};

const getZoomText = (scale: number) => (Math.round(Math.log(getNearestZoomScale(scale)) / Math.LN2) + 1).toString();

export const RoomToolsWidgetView: FC<{}> = (props) => {
    const [zoomScale, setZoomScale] = useState<number>(1);
    const [hasLikedRoom, setHasLikedRoom] = useState<boolean>(false);
    const [isToolsOpen, setIsToolsOpen] = useState<boolean>(true);
    const [isOpenHistory, setIsOpenHistory] = useState<boolean>(false);
    const [roomHistory, setRoomHistory] = useState<RoomHistoryEntry[]>([]);
    const [plugins, setPlugins] = useState<IOctanePlugin[]>([]);
    const { navigatorData } = useNavigatorData();
    const { roomSession = null } = useRoom();

    useEffect(() => {
        setPlugins(getRegisteredPlugins());
        return subscribePlugins(() => setPlugins(getRegisteredPlugins()));
    }, []);

    const getLogicalZoomScale = () => {
        if (!roomSession) return 1;

        const displayScale = GetRoomEngine().getRoomInstanceRenderingCanvasScale(roomSession.roomId, 1);
        const geometry = GetRoomEngine().getRoomInstanceGeometry(roomSession.roomId, 1);
        const geometryRatio = geometry ? geometry.scale / RoomGeometry.SCALE_ZOOMED_IN : 1;

        return getNearestZoomScale(displayScale * geometryRatio);
    };

    const applyZoomScale = (logicalScale: number) => {
        if (!roomSession) return;

        applyRoomZoom(roomSession.roomId, logicalScale);
        setZoomScale(logicalScale);
    };

    const updateZoomScale = () => {
        if (!roomSession) return;

        setZoomScale(getLogicalZoomScale());
    };

    const zoomRoom = (direction: number) => {
        if (!roomSession || direction === 0) return;

        if (!GetConfigurationValue('room.zoom.enabled', true)) {
            const geometry = GetRoomEngine().getRoomInstanceGeometry(roomSession.roomId, 1);
            if (!geometry) return;

            if (direction > 0) geometry.performZoomIn();
            else geometry.performZoomOut();

            setZoomScale(direction > 0 ? 2 : 1);
            return;
        }

        const currentScale = getLogicalZoomScale();
        const nextScale = getNextZoomScale(currentScale, direction);

        if (Math.abs(nextScale - currentScale) <= 0.001) return;

        applyZoomScale(nextScale);
    };

    const handleToolClick = (action: string, value?: string) => {
        if (!roomSession) return;

        switch (action) {
            case 'settings':
                CreateLinkEvent('navigator/toggle-room-info');
                return;
            case 'zoom_in':
                zoomRoom(1);
                return;
            case 'zoom_out':
                zoomRoom(-1);
                return;
            case 'chat_history':
                CreateLinkEvent('chat-history/toggle');
                return;
            case 'like_room':
                if (hasLikedRoom) return;
                SendMessageComposer(new RateFlatMessageComposer(1));
                setHasLikedRoom(true);
                return;
            case 'toggle_room_link':
                CreateLinkEvent('navigator/toggle-room-link');
                return;
            case 'room_history':
                if (roomHistory.length > 0) setIsOpenHistory((prev) => !prev);
                return;
            case 'room_history_back':
                const prevIndex = roomHistory.findIndex((room) => room.roomId === navigatorData.currentRoomId) - 1;
                if (prevIndex >= 0) TryVisitRoom(roomHistory[prevIndex].roomId);
                return;
            case 'room_history_next':
                const nextIndex = roomHistory.findIndex((room) => room.roomId === navigatorData.currentRoomId) + 1;
                if (nextIndex < roomHistory.length) TryVisitRoom(roomHistory[nextIndex].roomId);
                return;
        }
    };

    const currentRoomHistoryIndex = navigatorData ? roomHistory.findIndex((room) => room.roomId === navigatorData.currentRoomId) : -1;
    const hasHistory = roomHistory.length > 0;
    const canGoBack = currentRoomHistoryIndex > 0;
    const canGoNext = currentRoomHistoryIndex !== -1 && currentRoomHistoryIndex < roomHistory.length - 1;

    const onChangeRoomHistory = (roomId: number, roomName: string) => {
        if (!Number.isInteger(roomId) || roomId <= 0) return;

        let newStorage = readRoomHistory();
        if (newStorage.some((room) => room.roomId === roomId)) return;

        if (newStorage.length >= ROOM_HISTORY_MAX) newStorage.shift();
        newStorage = [...newStorage, { roomId, roomName: (roomName || '').slice(0, ROOM_NAME_MAX) }];

        setRoomHistory(newStorage);
        SetLocalStorage(ROOM_HISTORY_KEY, newStorage);
    };

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const parser = event.getParser();
        if (!parser.roomEnter || parser.data.roomId !== roomSession.roomId) return;

        onChangeRoomHistory(parser.data.roomId, parser.data.roomName);
    });

    useEffect(() => {
        setRoomHistory(readRoomHistory());
    }, []);

    useEffect(() => {
        setHasLikedRoom(false);
        updateZoomScale();
    }, [roomSession?.roomId]);

    // The renderer can be zoomed from outside this toolbar (keyboard shortcuts,
    // other widgets), so resync the displayed level whenever the engine reports it.
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.ROOM_ZOOMED, (event) => {
        if (!roomSession || event.roomId !== roomSession.roomId) return;

        updateZoomScale();
    });

    const tools = [
        { action: 'settings', icon: 'icon-cog', label: LocalizeText('room.settings.button.text') },
        { action: 'chat_history', icon: 'icon-chat-history', label: LocalizeText('room.chathistory.button.text') },
        ...(navigatorData.canRate || hasLikedRoom ? [{ action: 'like_room', icon: 'icon-like-room', label: LocalizeText('room.like.button.text'), disabled: hasLikedRoom }] : []),
        { action: 'toggle_room_link', icon: 'icon-room-link', label: LocalizeText('navigator.embed.caption') }
    ];

    const canZoomIn = getNextZoomScale(zoomScale, 1) !== getNearestZoomScale(zoomScale);
    const canZoomOut = getNextZoomScale(zoomScale, -1) !== getNearestZoomScale(zoomScale);

    return (
        <div className={classNames('octane-room-tools-container', !isToolsOpen && 'is-collapsed')}>
            <button className="room-tools-collapse-toggle" type="button" onClick={() => setIsToolsOpen((prevValue) => !prevValue)}>
                {isToolsOpen ? '‹' : '›'}
            </button>
            {isToolsOpen && (
                <div className="octane-room-tools">
                    <div className="room-tools-zoom-row">
                        <span>{LocalizeText('room.zoom.text', ['zoom_level'], [getZoomText(zoomScale)])}</span>
                        <button className="room-tools-zoom-button" type="button" title={LocalizeText('room.zoom.zoom_in.tooltip')} disabled={!canZoomIn} onClick={() => handleToolClick('zoom_in')}>
                            +
                        </button>
                        <button className="room-tools-zoom-button" type="button" title={LocalizeText('room.zoom.zoom_out.tooltip')} disabled={!canZoomOut} onClick={() => handleToolClick('zoom_out')}>
                            -
                        </button>
                    </div>
                    {tools.map((tool) => (
                        <div
                            key={tool.action}
                            className={classNames('room-tool-row', tool.disabled && 'is-disabled')}
                            title={tool.label}
                            onClick={() => !tool.disabled && handleToolClick(tool.action)}
                        >
                            <div className={classNames('octane-icon', tool.icon)} />
                            <span className="room-tool-label">{tool.label}</span>
                        </div>
                    ))}
                    {plugins.map((plugin) => (
                        <div
                            key={plugin.name}
                            className="room-tool-row"
                            title={plugin.label}
                            onClick={() => plugin.onOpen()}
                        >
                            <div className={classNames('octane-icon', plugin.icon || 'icon-cog')} />
                            <span className="room-tool-label">{plugin.label}</span>
                        </div>
                    ))}
                    <div className="room-history-controls">
                        <div
                            className={classNames('octane-icon', canGoBack ? 'cursor-pointer icon-room-history-back-enabled' : 'icon-room-history-back-disabled')}
                            title={LocalizeText('room.history.button.back.tooltip')}
                            onClick={() => canGoBack && handleToolClick('room_history_back')}
                        />
                        <div
                            className={classNames('octane-icon', hasHistory ? 'cursor-pointer icon-room-history-enabled' : 'icon-room-history-disabled')}
                            title={LocalizeText('room.history.button.tooltip')}
                            onClick={() => hasHistory && handleToolClick('room_history')}
                        />
                        <div
                            className={classNames('octane-icon', canGoNext ? 'cursor-pointer icon-room-history-next-enabled' : 'icon-room-history-next-disabled')}
                            title={LocalizeText('room.history.button.forward.tooltip')}
                            onClick={() => canGoNext && handleToolClick('room_history_next')}
                        />
                    </div>
                </div>
            )}
            <AnimatePresence>
                {isOpenHistory && isToolsOpen && (
                    <motion.div
                        initial={{ x: -100 }}
                        animate={{ x: 0 }}
                        exit={{ x: -100 }}
                        transition={{ duration: 0.3 }}
                        className="octane-room-tools-history"
                    >
                        <div className="flex flex-col px-3 py-2 rounded octane-room-history">
                            {roomHistory.map((history) => (
                                <Text
                                    key={history.roomId}
                                    bold={history.roomId === navigatorData.currentRoomId}
                                    variant="white"
                                    pointer
                                    className={classNames(
                                        'room-history-item',
                                        history.roomId === navigatorData.currentRoomId && 'room-history-item--current'
                                    )}
                                    onClick={() => TryVisitRoom(history.roomId)}
                                >
                                    {history.roomName}
                                </Text>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

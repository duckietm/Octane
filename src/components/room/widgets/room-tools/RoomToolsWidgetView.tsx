import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager, PerkEnum, RateFlatMessageComposer, RoomEngineEvent, RoomGeometry } from '@octane/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, SendMessageComposer, TryVisitRoom } from '../../../../api';
import { Text } from '../../../../common';
import { useAchievements, useNavigatorData, useOctaneEvent, usePerkAllowances, useRoom, useRoomVisitHistory, useUserDataSnapshot, useWiredToolsState } from '../../../../hooks';
import { classNames } from '../../../../layout';
import { getRegisteredPlugins, IOctanePlugin, subscribePlugins } from '../../../plugins/OctanePluginApi';
import { RoomToolsInfoView } from './RoomToolsInfoView';
import { ROOM_TOOL_HELP_BUBBLE_NAMES, resolveRoomToolsCollapsed } from './roomToolsState.helpers';
import { applyRoomZoom, getRoomZoomLevel, getRoomZoomScale, stepRoomZoom } from './roomZoom.helpers';

// The official client stores the collapsed state server-side (uiFlags & 2, `RoomToolsWidget.as:49`)
// and forces it for new users. The toggle is written back with `setRoomToolsState` (UpdateUIFlags,
// header 2313) and mirrored in the browser so the rail keeps its state before the next login.
const TOOLS_COLLAPSED_STORAGE_KEY = 'octane.room.tools.collapsed';
const WIRED_ACHIEVEMENTS_CATEGORY = 'wired_games';

const readToolsCollapsed = (): boolean | null => {
    try {
        const stored = window.localStorage.getItem(TOOLS_COLLAPSED_STORAGE_KEY);

        if (stored === null) return null;

        return stored === '1';
    } catch {
        return null;
    }
};

const writeToolsCollapsed = (collapsed: boolean) => {
    try {
        window.localStorage.setItem(TOOLS_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
        // Storage may be unavailable; the state still applies for this session.
    }
};

const snapZoomScale = (scale: number): number => getRoomZoomScale(getRoomZoomLevel(scale));

export const RoomToolsWidgetView: FC<{}> = (props) => {
    const [zoomScale, setZoomScale] = useState<number>(1);
    const [hasLikedRoom, setHasLikedRoom] = useState<boolean>(false);
    const { uiFlags = 0, isNoob = false } = useUserDataSnapshot();
    const [isToolsOpen, setIsToolsOpen] = useState<boolean>(() => !resolveRoomToolsCollapsed({ storedCollapsed: readToolsCollapsed(), uiFlags, isNoob }));
    const [isOpenHistory, setIsOpenHistory] = useState<boolean>(false);
    const [plugins, setPlugins] = useState<IOctanePlugin[]>([]);
    const { navigatorData } = useNavigatorData();
    const { roomSession = null } = useRoom();
    const { historyView = [], canGoBack = false, canGoForward = false, goBack = null, goForward = null, isNavigating = false } = useRoomVisitHistory();
    const { achievementCategories = [], setSelectedCategoryCode = null } = useAchievements();
    // RoomToolsWidget.as:50-52 only shows the achievements button when the room's wired
    // can actually hand one out, which the WiredEnvironment packet reports on entry.
    const { wiredEnvironment } = useWiredToolsState();
    const hasWiredAchievements = wiredEnvironment.enabledAchievements.length > 0;
    const { isPerkAllowed } = usePerkAllowances();

    // Official `RoomToolsWidget.as:48`: the camera entry needs the CAMERA perk and the
    // `camera.launch.ui.position` of the room menu.
    const cameraPosition = GetConfigurationValue<string>('camera.launch.ui.position', '') ?? '';
    const showCameraTool = isPerkAllowed(PerkEnum.CAMERA) && (cameraPosition === '' || cameraPosition === 'room-menu');

    useEffect(() => {
        setPlugins(getRegisteredPlugins());
        return subscribePlugins(() => setPlugins(getRegisteredPlugins()));
    }, []);

    const getLogicalZoomScale = () => {
        if (!roomSession) return 1;

        const displayScale = GetRoomEngine().getRoomInstanceRenderingCanvasScale(roomSession.roomId, 1);
        const geometry = GetRoomEngine().getRoomInstanceGeometry(roomSession.roomId, 1);
        const geometryRatio = geometry ? geometry.scale / RoomGeometry.SCALE_ZOOMED_IN : 1;

        return snapZoomScale(displayScale * geometryRatio);
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

    const zoomRoom = (direction: -1 | 1) => {
        if (!roomSession) return;

        if (!GetConfigurationValue('room.zoom.enabled', true)) {
            const geometry = GetRoomEngine().getRoomInstanceGeometry(roomSession.roomId, 1);
            if (!geometry) return;

            if (direction > 0) geometry.performZoomIn();
            else geometry.performZoomOut();

            setZoomScale(direction > 0 ? 2 : 1);
            return;
        }

        const currentScale = getLogicalZoomScale();
        const nextScale = stepRoomZoom(currentScale, direction);

        if (Math.abs(nextScale - currentScale) <= 0.001) return;

        applyZoomScale(nextScale);
    };

    const openAchievements = () => {
        // The official button deep-links to the wired games category; fall
        // back to the plain achievements window when the hotel has none.
        const wiredCategory = achievementCategories.find((category) => category.code === WIRED_ACHIEVEMENTS_CATEGORY);

        if (wiredCategory && setSelectedCategoryCode) setSelectedCategoryCode(wiredCategory.code);

        CreateLinkEvent('achievements/show');
    };

    const handleToolClick = (action: string) => {
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
            case 'achievements':
                openAchievements();
                return;
            case 'camera':
                CreateLinkEvent('camera/toggle');
                return;
            case 'room_history':
                if (historyView.length > 0) setIsOpenHistory((prev) => !prev);
                return;
            case 'room_history_back':
                if (canGoBack) goBack();
                return;
            case 'room_history_next':
                if (canGoForward) goForward();
                return;
        }
    };

    const toggleTools = () => {
        setIsToolsOpen((prevValue) => {
            writeToolsCollapsed(prevValue);
            // Official `SessionDataManager.setRoomToolsState(expanded)` -> uiFlags bit 2.
            GetSessionDataManager()?.setRoomToolsState?.(!prevValue);

            return !prevValue;
        });
    };

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
        { action: 'toggle_room_link', icon: 'icon-room-link', label: LocalizeText('navigator.embed.caption') },
        ...(hasWiredAchievements ? [{ action: 'achievements', icon: 'icon-room-achievements', label: localizeWithFallback('room.achievements.button.text', 'Achievements') }] : []),
        ...(showCameraTool ? [{ action: 'camera', icon: 'icon-camera-small', label: localizeWithFallback('room.camera.button.text', 'Camera') }] : [])
    ];

    const hasHistory = historyView.length > 0;
    const currentZoomLevel = getRoomZoomLevel(zoomScale);
    const canZoomIn = stepRoomZoom(zoomScale, 1) !== snapZoomScale(zoomScale);
    const canZoomOut = stepRoomZoom(zoomScale, -1) !== snapZoomScale(zoomScale);

    return (
        <div className={classNames('octane-room-tools-container', !isToolsOpen && 'is-collapsed')}>
            <button className="room-tools-collapse-toggle" type="button" onClick={toggleTools}>
                {isToolsOpen ? '‹' : '›'}
            </button>
            {isToolsOpen && (
                <div className="octane-room-tools">
                    <div className="room-tools-zoom-row">
                        <span>{LocalizeText('room.zoom.text', ['zoom_level'], [currentZoomLevel.toString()])}</span>
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
                            data-help-bubble={ROOM_TOOL_HELP_BUBBLE_NAMES[tool.action]}
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
                    <div className={classNames('room-history-controls', isNavigating && 'is-navigating')}>
                        <div
                            className={classNames('octane-icon', canGoBack ? 'cursor-pointer icon-room-history-back-enabled' : 'icon-room-history-back-disabled')}
                            role="button"
                            aria-disabled={!canGoBack}
                            title={LocalizeText('room.history.button.back.tooltip')}
                            data-help-bubble="button_history_back"
                            onClick={() => handleToolClick('room_history_back')}
                        />
                        <div
                            className={classNames('octane-icon', hasHistory ? 'cursor-pointer icon-room-history-enabled' : 'icon-room-history-disabled')}
                            role="button"
                            aria-disabled={!hasHistory}
                            title={LocalizeText('room.history.button.tooltip')}
                            data-help-bubble="button_history"
                            onClick={() => handleToolClick('room_history')}
                        />
                        <div
                            className={classNames('octane-icon', canGoForward ? 'cursor-pointer icon-room-history-next-enabled' : 'icon-room-history-next-disabled')}
                            role="button"
                            aria-disabled={!canGoForward}
                            title={LocalizeText('room.history.button.forward.tooltip')}
                            data-help-bubble="button_history_forward"
                            onClick={() => handleToolClick('room_history_next')}
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
                            {historyView.map((history) => (
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
            <RoomToolsInfoView isToolsOpen={isToolsOpen} />
        </div>
    );
};

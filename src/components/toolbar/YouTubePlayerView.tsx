import {
    ControlYoutubeDisplayPlaybackMessageComposer,
    YouTubeRoomBroadcastEvent,
    YouTubeRoomPlayComposer,
    YouTubeRoomSettingsEvent,
    YouTubeRoomWatchersEvent,
    YouTubeRoomWatchingComposer
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { CopyToClipboard, GetRoomSession, getYoutubeRoomEnabled, LocalizeText, SendMessageComposer, YoutubeVideoPlaybackStateEnum } from '../../api';
import { LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useFurnitureYoutubeWidget, useHasPermission, useMessageEvent } from '../../hooks';
import ReactPlayer from '../youtube/YoutubeReactPlayer';

const CONTROL_COMMAND_PREVIOUS_VIDEO = 0;
const CONTROL_COMMAND_NEXT_VIDEO = 1;
const CONTROL_COMMAND_PAUSE_VIDEO = 2;
const CONTROL_COMMAND_CONTINUE_VIDEO = 3;

const extractVideoId = (input: string): string => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) return match[1];
    }
    return input;
};

export const YouTubePlayerView: FC<{}> = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState<'player' | 'playlist' | 'spectators' | 'settings' | 'history' | 'share'>('player');
    const [inputValue, setInputValue] = useState('');
    const [isRoomMode, setIsRoomMode] = useState(false);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [volumePreset, setVolumePreset] = useState<number>(100);
    const [playlist, setPlaylist] = useState<string[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [showVolumeSlider, setShowVolumeSlider] = useState(true);
    const playerRef = useRef<HTMLVideoElement | null>(null);
    const { objectId: youtubeObjectId, videoId: roomVideoId, currentVideoState, hasControl } = useFurnitureYoutubeWidget();
    const [spectators, setSpectators] = useState<{ id: number; name: string; look: string }[]>([]);
    const [broadcastVideo, setBroadcastVideo] = useState('');
    const [broadcastSender, setBroadcastSender] = useState('');
    const [broadcastPlaylist, setBroadcastPlaylist] = useState<string[]>([]);
    const [watcherIds, setWatcherIds] = useState<Set<number>>(new Set());
    const [youtubeEnabled, setYoutubeEnabled] = useState(getYoutubeRoomEnabled());
    // Reactive — must sit above the `if (!isOpen) return null` below
    // so the hook order stays stable across renders.
    const isModerator = useHasPermission('acc_anyroomowner');

    useMessageEvent<YouTubeRoomSettingsEvent>(YouTubeRoomSettingsEvent, (event) => {
        setYoutubeEnabled(event.getParser().youtubeEnabled);
    });
    useMessageEvent<YouTubeRoomBroadcastEvent>(YouTubeRoomBroadcastEvent, (event) => {
        const parser = event.getParser();
        setBroadcastVideo(parser.videoId);
        setBroadcastSender(parser.senderName);
        setBroadcastPlaylist(parser.playlist);
        if (parser.videoId) {
            setInputValue(parser.videoId);
            setIsOpen(true);
            setTab('player');
        } else {
            setInputValue('');
            setBroadcastVideo('');
            setBroadcastSender('');
            setBroadcastPlaylist([]);
        }
    });

    useMessageEvent<YouTubeRoomWatchersEvent>(YouTubeRoomWatchersEvent, (event) => {
        setWatcherIds(new Set(event.getParser().watcherIds));
        loadRoomUsers();
    });

    const sentWatchingRef = useRef(false);
    const hasVideo = !!(inputValue && extractVideoId(inputValue));
    useEffect(() => {
        if (isOpen && hasVideo && !sentWatchingRef.current) {
            try {
                SendMessageComposer(new YouTubeRoomWatchingComposer(true));
            } catch (e) {}
            sentWatchingRef.current = true;
        } else if ((!isOpen || !hasVideo) && sentWatchingRef.current) {
            try {
                SendMessageComposer(new YouTubeRoomWatchingComposer(false));
            } catch (e) {}
            sentWatchingRef.current = false;
        }
    }, [isOpen, hasVideo]);

    const loadRoomUsers = () => {
        try {
            const roomSession = GetRoomSession();
            if (!roomSession) {
                setSpectators([]);
                return;
            }
            const users: { id: number; name: string; look: string }[] = [];
            const seen = new Set<number>();
            for (let i = 0; i < 500; i++) {
                const userData = roomSession.userDataManager.getUserDataByIndex(i);
                if (userData && userData.name && userData.type === 1 && !seen.has(userData.webID)) {
                    seen.add(userData.webID);
                    users.push({ id: userData.webID, name: userData.name, look: userData.figure });
                }
            }
            setSpectators(users);
        } catch (e) {
            setSpectators([]);
        }
    };

    useEffect(() => {
        if (isOpen) loadRoomUsers();
    }, [isOpen]);

    useEffect(() => {
        if (youtubeObjectId && youtubeObjectId !== -1) {
            setIsRoomMode(true);
            if (roomVideoId) {
                setInputValue(roomVideoId);
            }
        } else {
            setIsRoomMode(false);
        }
    }, [youtubeObjectId, roomVideoId]);

    useEffect(() => {
        const handler = () => setIsOpen((p) => !p);
        window.addEventListener('youtube:toggle', handler);
        return () => window.removeEventListener('youtube:toggle', handler);
    }, []);

    useEffect(() => {
        const savedHistory = localStorage.getItem('youtube_history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (Array.isArray(parsed)) {
                    setHistory(parsed.map((entry: any) => (typeof entry === 'string' ? entry : entry?.id)).filter(Boolean));
                }
            } catch (e) {}
        }
        const savedPlaylist = localStorage.getItem('youtube_playlist');
        if (savedPlaylist) {
            try {
                const parsed = JSON.parse(savedPlaylist);
                if (Array.isArray(parsed)) {
                    setPlaylist(parsed.map((entry: any) => (typeof entry === 'string' ? entry : entry?.id)).filter(Boolean));
                }
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('youtube_history', JSON.stringify(history.slice(0, 50)));
    }, [history]);

    useEffect(() => {
        localStorage.setItem('youtube_playlist', JSON.stringify(playlist));
    }, [playlist]);

    const addToHistory = (id: string) => {
        if (!id) return;
        setHistory((prev) => {
            const filtered = prev.filter((v) => v !== id);
            return [id, ...filtered].slice(0, 50);
        });
    };

    const handlePlay = () =>
        isRoomMode &&
        youtubeObjectId &&
        hasControl &&
        SendMessageComposer(new ControlYoutubeDisplayPlaybackMessageComposer(youtubeObjectId, CONTROL_COMMAND_CONTINUE_VIDEO));
    const handlePause = () =>
        isRoomMode &&
        youtubeObjectId &&
        hasControl &&
        SendMessageComposer(new ControlYoutubeDisplayPlaybackMessageComposer(youtubeObjectId, CONTROL_COMMAND_PAUSE_VIDEO));
    const handlePrev = () =>
        isRoomMode &&
        youtubeObjectId &&
        hasControl &&
        SendMessageComposer(new ControlYoutubeDisplayPlaybackMessageComposer(youtubeObjectId, CONTROL_COMMAND_PREVIOUS_VIDEO));
    const handleNext = () =>
        isRoomMode &&
        youtubeObjectId &&
        hasControl &&
        SendMessageComposer(new ControlYoutubeDisplayPlaybackMessageComposer(youtubeObjectId, CONTROL_COMMAND_NEXT_VIDEO));

    const addToPlaylist = () => {
        const id = extractVideoId(inputValue);
        if (id && !playlist.includes(id)) {
            setPlaylist((p) => [...p, id]);
        }
    };

    if (!isOpen) return null;

    const videoId = extractVideoId(inputValue);
    const isPlaying = currentVideoState === YoutubeVideoPlaybackStateEnum.PLAYING;
    const isPaused = currentVideoState === YoutubeVideoPlaybackStateEnum.PAUSED;
    const roomSession = GetRoomSession();
    const isMyRoom = isModerator || (roomSession && roomSession.isRoomOwner);

    const QuickVolumeButton = ({ value, label }: { value: number; label: string }) => (
        <button
            onClick={() => {
                setVolume(value);
                setVolumePreset(value);
            }}
            className={`px-2 py-1 rounded text-xs ${volumePreset === value ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
            {label}
        </button>
    );

    return (
        <OctaneCardView className={`youtube-player-modal ${isFullscreen ? '!fixed inset-0 w-full h-full z-[9999] rounded-none' : 'w-[550px]'}`}>
            <OctaneCardHeaderView headerText={isRoomMode ? '📺 YouTube TV' : '▶ YouTube'} onCloseClick={() => setIsOpen(false)} />
            <OctaneCardContentView>
                <div className="flex gap-1 mb-3 border-b border-gray-700 pb-2 flex-wrap">
                    <button
                        onClick={() => setTab('player')}
                        className={`px-3 py-1 rounded text-sm ${tab === 'player' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        ▶
                    </button>
                    <button
                        onClick={() => setTab('playlist')}
                        className={`px-3 py-1 rounded text-sm ${tab === 'playlist' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        📋 {playlist.length}
                    </button>
                    <button
                        onClick={() => setTab('history')}
                        className={`px-3 py-1 rounded text-sm ${tab === 'history' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        🕐 {history.length}
                    </button>
                    <button
                        onClick={() => setTab('share')}
                        className={`px-3 py-1 rounded text-sm ${tab === 'share' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        📤
                    </button>
                    {watcherIds.size > 0 && (
                        <button
                            onClick={() => {
                                setTab('spectators');
                                loadRoomUsers();
                            }}
                            className={`px-3 py-1 rounded text-sm ${tab === 'spectators' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                        >
                            📺 {watcherIds.size}
                        </button>
                    )}
                    <button
                        onClick={() => setTab('settings')}
                        className={`px-3 py-1 rounded text-sm ${tab === 'settings' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        ⚙️
                    </button>
                </div>

                {tab === 'player' && (
                    <>
                        {isRoomMode && (
                            <div className="mb-2 p-2 bg-blue-900/50 rounded flex justify-between text-sm">
                                <span className="text-blue-300">📺 Connected with YouTube TV</span>
                                <div className="flex gap-2">
                                    {isPlaying && <span className="text-green-400">▶ {LocalizeText('connection.login.play')}</span>}
                                    {isPaused && <span className="text-yellow-400">⏸ {LocalizeText('wiredfurni.params.clock_control.3')}</span>}
                                    {isMyRoom && <span className="text-green-400 text-xs">✓ {LocalizeText('navigator.filter.owner')}</span>}
                                </div>
                            </div>
                        )}

                        {videoId ? (
                            <ReactPlayer
                                ref={(ref) => {
                                    playerRef.current = ref;
                                }}
                                src={`https://www.youtube.com/watch?v=${videoId}`}
                                width="100%"
                                height={isFullscreen ? '100%' : 280}
                                playing
                                muted={isMuted}
                                loop={isLooping}
                                volume={Math.max(0, Math.min(1, volume / 100))}
                                config={{
                                    youtube: {}
                                }}
                                onReady={() => addToHistory(videoId)}
                            />
                        ) : (
                            <div className="h-[280px] flex items-center justify-center bg-gray-800 text-gray-500">
                                {LocalizeText('widget.furni.video_viewer.no_videos')}
                            </div>
                        )}

                        {isRoomMode && hasControl && (
                            <div className="mt-2 flex gap-2 justify-center">
                                <button onClick={handlePrev} className="px-3 py-1 bg-gray-700 rounded text-white text-sm">
                                    ◀◀
                                </button>
                                <button onClick={isPlaying ? handlePause : handlePlay} className="px-4 py-1 bg-amber-600 rounded text-white font-bold text-sm">
                                    {isPlaying ? '⏸' : '▶'}
                                </button>
                                <button onClick={handleNext} className="px-3 py-1 bg-gray-700 rounded text-white text-sm">
                                    ▶▶
                                </button>
                            </div>
                        )}

                        {broadcastVideo && broadcastSender && (
                            <div className="mt-2 p-2 bg-purple-900/50 rounded text-sm flex justify-between items-center">
                                <span className="text-purple-300">📡 {broadcastSender} broadcasting</span>
                                {isMyRoom && (
                                    <button
                                        onClick={() => {
                                            try {
                                                SendMessageComposer(new YouTubeRoomPlayComposer('', []));
                                            } catch (e) {}
                                            setBroadcastVideo('');
                                            setBroadcastSender('');
                                            setBroadcastPlaylist([]);
                                        }}
                                        className="px-2 py-0.5 bg-red-700 hover:bg-red-600 rounded text-white text-xs"
                                    >
                                        ⏹ {LocalizeText('useproduct.widget.cancel')}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={!!broadcastVideo && !isMyRoom}
                                className={`flex-1 p-2 rounded text-white text-sm ${!!broadcastVideo && !isMyRoom ? 'bg-gray-800' : 'bg-gray-700'}`}
                                placeholder="YouTube URL / video ID"
                            />
                            {isMyRoom && youtubeEnabled && videoId && (
                                <button
                                    onClick={() => {
                                        try {
                                            SendMessageComposer(new YouTubeRoomPlayComposer(videoId, playlist));
                                        } catch (e) {}
                                    }}
                                    className="px-3 bg-purple-600 rounded text-white text-sm whitespace-nowrap"
                                    title="Speel deze video voor iedereen in de kamer"
                                >
                                    📡 {LocalizeText('wiredchests.logs.type.1')}
                                </button>
                            )}
                        </div>
                    </>
                )}

                {tab === 'playlist' && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Add video URL..."
                                className="flex-1 p-2 bg-gray-700 text-white rounded text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && addToPlaylist()}
                            />
                            <button onClick={addToPlaylist} className="px-4 bg-purple-600 rounded text-white">
                                +
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setInputValue('')} className="flex-1 px-3 py-2 bg-gray-700 rounded text-white text-sm">
                                🔄 New video
                            </button>
                            <button onClick={() => setPlaylist([])} className="px-3 py-2 bg-red-900 rounded text-white text-sm">
                                🗑 Clear
                            </button>
                        </div>
                        {playlist.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Playlist is empty</div>
                        ) : (
                            <div className="max-h-[250px] overflow-y-auto space-y-1">
                                {playlist.map((id, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
                                        onClick={() => {
                                            setInputValue(id);
                                            setTab('player');
                                        }}
                                    >
                                        <span className="text-amber-500 text-sm w-6">{i + 1}.</span>
                                        <div className="flex-1 min-w-0 text-white text-sm truncate font-mono">{id}</div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPlaylist((p) => p.filter((x) => x !== id));
                                            }}
                                            className="text-red-500 px-2"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'history' && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="text-gray-400 text-sm">🕐 Watch history ({history.length})</div>
                            <button onClick={() => setHistory([])} className="text-red-400 text-xs hover:text-red-300">
                                🗑 Clear
                            </button>
                        </div>
                        {history.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No videos watched yet</div>
                        ) : (
                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                                {history.map((id, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
                                        onClick={() => {
                                            setInputValue(id);
                                            setTab('player');
                                        }}
                                    >
                                        <div className="flex-1 min-w-0 text-white text-sm truncate font-mono">{id}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'share' && (
                    <div className="space-y-3">
                        <div className="p-3 bg-gray-800 rounded">
                            <div className="text-gray-400 text-sm mb-2">📤 Share video</div>
                            {videoId ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={`https://youtube.com/watch?v=${videoId}`}
                                            readOnly
                                            className="flex-1 p-2 bg-gray-700 text-white rounded text-sm"
                                        />
                                        <button
                                            onClick={() => {
                                                void CopyToClipboard(`https://youtube.com/watch?v=${videoId}`);
                                            }}
                                            className="px-3 bg-blue-600 rounded text-white text-sm"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm text-center py-4">Select a video first to share</div>
                            )}
                        </div>
                        <div className="p-3 bg-gray-800 rounded">
                            <div className="text-gray-400 text-sm mb-2">📋 Quick share</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        if (videoId) {
                                            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                                `Now watching: https://youtube.com/watch?v=${videoId}`
                                            )}`;
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    disabled={!videoId}
                                    className="px-3 py-2 bg-blue-600 rounded text-white text-sm disabled:opacity-50"
                                >
                                    🐦 Twitter
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'spectators' &&
                    (() => {
                        const watchers: { id: number; name: string; look: string }[] = [];
                        const rs = GetRoomSession();
                        if (rs) {
                            for (const uid of watcherIds) {
                                const ud = rs.userDataManager.getUserData(uid);
                                if (ud && ud.name) {
                                    watchers.push({ id: ud.webID, name: ud.name, look: ud.figure });
                                }
                            }
                        }
                        return (
                            <div className="p-3 bg-gray-800 rounded">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-gray-400 text-sm">📺 {watchers.length} watching</div>
                                    <button onClick={loadRoomUsers} className="text-gray-400 hover:text-white text-xs">
                                        🔄
                                    </button>
                                </div>
                                {watchers.length === 0 ? (
                                    <div className="text-gray-500 text-sm text-center py-4">No one is watching</div>
                                ) : (
                                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                                        {watchers.map((user) => (
                                            <div key={user.id} className="flex items-center gap-2 p-2 bg-gray-700 rounded">
                                                <div className="shrink-0 overflow-hidden">
                                                    <LayoutAvatarImageView
                                                        figure={user.look}
                                                        headOnly
                                                        direction={2}
                                                        scale={1}
                                                        className="!w-[45px] !h-[65px] -mt-[5px] -ml-[5px]"
                                                    />
                                                </div>
                                                <span className="text-white text-sm flex-1">{user.name}</span>
                                                <span className="text-amber-400 text-xs">📺</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                {tab === 'settings' && (
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-white text-sm">🔊 Volume: {volume}%</label>
                                <button onClick={() => setShowVolumeSlider(!showVolumeSlider)} className="text-gray-400 text-xs">
                                    {showVolumeSlider ? '▼' : '▲'}
                                </button>
                            </div>
                            {showVolumeSlider && (
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => {
                                        setVolume(parseInt(e.target.value));
                                        setVolumePreset(parseInt(e.target.value));
                                    }}
                                    className="w-full"
                                />
                            )}
                            <div className="flex gap-1 mt-2">
                                <QuickVolumeButton value={0} label="🔇" />
                                <QuickVolumeButton value={25} label="25%" />
                                <QuickVolumeButton value={50} label="50%" />
                                <QuickVolumeButton value={75} label="75%" />
                                <QuickVolumeButton value={100} label="100%" />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                <input type="checkbox" checked={isMuted} onChange={(e) => setIsMuted(e.target.checked)} className="w-4 h-4" />🔇 Mute
                            </label>
                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                <input type="checkbox" checked={isLooping} onChange={(e) => setIsLooping(e.target.checked)} className="w-4 h-4" />🔁 Loop
                            </label>
                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                <input type="checkbox" checked={isFullscreen} onChange={(e) => setIsFullscreen(e.target.checked)} className="w-4 h-4" />
                                🖥️ Fullscreen
                            </label>
                        </div>

                        <div className="p-2 bg-gray-800 rounded text-xs text-gray-400">
                            <div className="font-bold mb-1">ℹ️ Info</div>
                            <div>
                                📡 Broadcast:{' '}
                                {broadcastVideo ? (
                                    <span className="text-green-400">✓ Active ({broadcastSender} playing)</span>
                                ) : (
                                    <span className="text-gray-500">✕ No video</span>
                                )}
                            </div>
                            <div>
                                🎮 Controle:{' '}
                                {isMyRoom ? <span className="text-green-400">✓ You are the owner</span> : <span className="text-gray-500">✕ Viewing only</span>}
                            </div>
                            <div>
                                👁️ Viewers: <span className="text-amber-400">{watcherIds.size}</span>
                            </div>
                        </div>
                    </div>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

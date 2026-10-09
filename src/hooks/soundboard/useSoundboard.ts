import {
    GetSessionDataManager,
    GetSoundManager,
    ISoundboardSound,
    loadGamedata,
    SoundboardPlayComposer,
    SoundboardPlayDeniedEvent,
    SoundboardPlayEvent,
    SoundboardRequestSettingsComposer,
    SoundboardSetEnabledComposer,
    SoundboardSettingsEvent
} from '@octane/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { DispatchUiEvent, GetConfigurationValue, LocalizeText, NotificationBubbleType, SendMessageComposer, setSoundboardRoomEnabled } from '../../api';
import { SoundboardRoomMessageEvent } from '../../events';
import { useMessageEvent } from '../events';
import { useNotificationActions } from '../notification';
import { loadFavoriteIds, saveFavoriteIds, toggleFavoriteId } from './soundboardFavorites';
import { addSilencedUserId, loadSilencedUserIds, saveSilencedUserIds } from './soundboardSilencedUsers';
import { useSoundboardFeedStore } from './soundboardFeedStore';
import { normalizeLegacySoundboardCatalog } from './soundboardLegacyCatalog';
import {
    DisplaySoundboardSound,
    mergeSoundboardPresentation,
    normalizeSoundboardLayout,
    pushRecentSound,
    SoundboardCategory,
    SoundboardLayout,
    soundboardPlayOptions
} from './soundboardPresentation';
import { getRemainingCooldownSeconds, shouldStartOwnCooldown } from './soundboardUi.helpers';
import { resolveSoundboardSoundUrl } from './soundboardUrl';
import { useSoundboardManifest } from './useSoundboardManifest';

const roomModeNoticeKeys: Record<number, string> = {
    0: 'soundboard.notice.mode.off',
    1: 'soundboard.notice.mode.everyone',
    2: 'soundboard.notice.mode.rights'
};

const deniedReasonText: Record<number, string> = {
    2: 'soundboard.error.room_disabled',
    4: 'soundboard.error.rights_required'
};

export type ClientSoundboardSound = DisplaySoundboardSound & { local?: boolean };

export const useSoundboardState = () => {
    const [roomMode, setRoomModeState] = useState(0);
    const enabled = roomMode > 0;
    const [serverSounds, setServerSounds] = useState<ISoundboardSound[]>([]);
    const [legacySounds, setLegacySounds] = useState<ISoundboardSound[]>([]);
    const [layout, setLayout] = useState<SoundboardLayout>(() => normalizeSoundboardLayout(null));
    const [recentSoundIds, setRecentSoundIds] = useState<number[]>([]);
    const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0);
    const [cooldownTotalSeconds, setCooldownTotalSeconds] = useState(0);
    const [favoriteIds, setFavoriteIds] = useState<number[]>(loadFavoriteIds);
    const [silencedUserIds, setSilencedUserIds] = useState<number[]>(loadSilencedUserIds);
    const silencedUserIdsRef = useRef(silencedUserIds);
    const cooldownSecondsRef = useRef(0);
    const cooldownUntilRef = useRef(0);
    const legacyLoadStartedRef = useRef(false);
    const knownRoomModeRef = useRef<number | null>(null);
    const { showSingleBubble } = useNotificationActions();
    const { manifest, manifestRef } = useSoundboardManifest();

    const showCooldownBubble = useCallback(
        (remainingSeconds: number) => {
            const seconds = Math.max(1, remainingSeconds);
            showSingleBubble(LocalizeText('soundboard.error.cooldown', ['seconds'], [seconds.toString()]), NotificationBubbleType.SOUNDBOARD);
        },
        [showSingleBubble]
    );

    const handleSettings = useCallback(
        (event: SoundboardSettingsEvent) => {
            const parser = event.getParser();
            const previousMode = knownRoomModeRef.current;
            knownRoomModeRef.current = parser.roomMode;
            cooldownSecondsRef.current = Math.max(0, parser.cooldownSeconds);
            setRoomModeState(parser.roomMode);
            setServerSounds(parser.sounds);
            setSoundboardRoomEnabled(parser.enabled);

            // Only a change made while the player is in the room is news; the first packet of a room is not.
            const noticeKey = roomModeNoticeKeys[parser.roomMode];
            if (previousMode !== null && previousMode !== parser.roomMode && noticeKey) {
                showSingleBubble(LocalizeText(noticeKey), NotificationBubbleType.SOUNDBOARD);
            }
        },
        [showSingleBubble]
    );

    useMessageEvent<SoundboardSettingsEvent>(SoundboardSettingsEvent, handleSettings);

    const handleDenied = useCallback(
        (event: SoundboardPlayDeniedEvent) => {
            const parser = event.getParser();

            if (parser.reason === 1) {
                const seconds = Math.max(1, parser.remainingSeconds);
                const now = Date.now();
                cooldownUntilRef.current = now + seconds * 1_000;
                setCooldownTotalSeconds(seconds);
                setCooldownRemainingSeconds(getRemainingCooldownSeconds(cooldownUntilRef.current, now));
                showCooldownBubble(seconds);
                return;
            }

            // This pad is held, the others are not: tell the player, but leave the panel unlocked.
            if (parser.reason === 5) {
                const seconds = Math.max(1, parser.remainingSeconds);
                showSingleBubble(LocalizeText('soundboard.error.pad_cooldown', ['seconds'], [seconds.toString()]), NotificationBubbleType.SOUNDBOARD);
                return;
            }

            const key = deniedReasonText[parser.reason] ?? 'soundboard.error.unavailable';
            showSingleBubble(LocalizeText(key), NotificationBubbleType.SOUNDBOARD);
        },
        [showCooldownBubble, showSingleBubble]
    );

    useMessageEvent<SoundboardPlayDeniedEvent>(SoundboardPlayDeniedEvent, handleDenied);

    useEffect(() => {
        silencedUserIdsRef.current = silencedUserIds;
    }, [silencedUserIds]);

    const handlePlay = useCallback(
        (event: SoundboardPlayEvent) => {
            const parser = event.getParser();
            const ownUserId = GetSessionDataManager()?.getUserDataSnapshot?.().userId || -1;

            // Somebody the player muted is neither heard nor shown; the player's own pads are never muted.
            if (parser.actorUserId !== ownUserId && silencedUserIdsRef.current.includes(parser.actorUserId)) return;

            const asset = manifestRef.current.byClassname.get(parser.classname?.trim().toLowerCase() ?? '');

            void GetSoundManager()
                .playSoundboard(resolveSoundboardSoundUrl({ classname: parser.classname, url: parser.url }, manifestRef.current), soundboardPlayOptions(asset))
                .then((played) => {
                    if (!played) showSingleBubble(LocalizeText('soundboard.error.audio'), NotificationBubbleType.SOUNDBOARD);
                });
            setRecentSoundIds((current) => pushRecentSound(current, parser.soundId));
            useSoundboardFeedStore.getState().push({ username: parser.username, userId: parser.actorUserId, soundName: parser.soundName, soundId: parser.soundId });
            DispatchUiEvent(new SoundboardRoomMessageEvent(parser.username, parser.soundName, parser.actorUserId, parser.actorRoomIndex));

            if (shouldStartOwnCooldown(parser.actorUserId, ownUserId, cooldownSecondsRef.current)) {
                const now = Date.now();
                cooldownUntilRef.current = now + cooldownSecondsRef.current * 1_000;
                setCooldownTotalSeconds(cooldownSecondsRef.current);
                setCooldownRemainingSeconds(getRemainingCooldownSeconds(cooldownUntilRef.current, now));
            }
        },
        [showSingleBubble]
    );

    useMessageEvent<SoundboardPlayEvent>(SoundboardPlayEvent, handlePlay);

    const isCoolingDown = cooldownRemainingSeconds > 0;

    useEffect(() => {
        if (!isCoolingDown) return;

        const updateRemaining = () => setCooldownRemainingSeconds(getRemainingCooldownSeconds(cooldownUntilRef.current, Date.now()));
        const timer = window.setInterval(updateRemaining, 250);

        return () => window.clearInterval(timer);
    }, [isCoolingDown]);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        const url = GetConfigurationValue<string>('soundboard.layout.url') || 'configuration/soundboard-layout.jsonc';

        void loadGamedata<unknown>(url)
            .then((value) => {
                if (!cancelled) setLayout(normalizeSoundboardLayout(value));
            })
            .catch(() => {
                if (!cancelled) setLayout(normalizeSoundboardLayout(null));
            });

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    useEffect(() => {
        if (!enabled || serverSounds.length || legacyLoadStartedRef.current) return;

        legacyLoadStartedRef.current = true;
        let cancelled = false;
        const url =
            GetConfigurationValue<string>('soundboard.url') ||
            GetConfigurationValue<string>('soundboard.sounds.url') ||
            'configuration/soundboard-sounds.jsonc';

        void loadGamedata<unknown>(url)
            .then((value) => {
                if (!cancelled) setLegacySounds(normalizeLegacySoundboardCatalog(value));
            })
            .catch(() => {
                if (!cancelled) setLegacySounds([]);
            });

        return () => {
            cancelled = true;
        };
    }, [enabled, serverSounds.length]);

    const sounds = useMemo<ClientSoundboardSound[]>(() => {
        if (serverSounds.length) return mergeSoundboardPresentation(serverSounds, layout, manifest);

        return mergeSoundboardPresentation(legacySounds, layout, manifest).map((sound) => ({ ...sound, local: true }));
    }, [serverSounds, legacySounds, layout, manifest]);

    // Categories declared in the layout file win on label; the manifest fills
    // in any the hotel has not named.
    const categories = useMemo<SoundboardCategory[]>(() => {
        const seen = new Set(layout.categories.map((category) => category.id));

        return [...layout.categories, ...manifest.categories.filter((category) => !seen.has(category.id))];
    }, [layout.categories, manifest.categories]);

    const play = useCallback(
        (sound: ClientSoundboardSound) => {
            if (!sound) return;

            if (sound.local) {
                void GetSoundManager()
                    .playSoundboard(resolveSoundboardSoundUrl(sound, manifestRef.current), soundboardPlayOptions(sound))
                    .then((played) => {
                        if (!played) showSingleBubble(LocalizeText('soundboard.error.audio'), NotificationBubbleType.SOUNDBOARD);
                    });
                setRecentSoundIds((current) => pushRecentSound(current, sound.id));
                return;
            }

            const remainingSeconds = getRemainingCooldownSeconds(cooldownUntilRef.current, Date.now());
            if (remainingSeconds > 0) {
                setCooldownRemainingSeconds(remainingSeconds);
                showCooldownBubble(remainingSeconds);
                return;
            }

            SendMessageComposer(new SoundboardPlayComposer(sound.id));
        },
        [showCooldownBubble, showSingleBubble]
    );

    const toggleFavorite = useCallback((soundId: number) => {
        setFavoriteIds((current) => {
            const next = toggleFavoriteId(current, soundId);
            saveFavoriteIds(next);
            return next;
        });
    }, []);

    const silenceUser = useCallback((userId: number) => {
        setSilencedUserIds((current) => {
            const next = addSilencedUserId(current, userId);
            saveSilencedUserIds(next);
            return next;
        });
    }, []);

    const restoreSilencedUsers = useCallback(() => {
        setSilencedUserIds([]);
        saveSilencedUserIds([]);
    }, []);

    const refresh = useCallback(() => {
        SendMessageComposer(new SoundboardRequestSettingsComposer());
    }, []);

    const setRoomMode = useCallback((mode: number) => {
        knownRoomModeRef.current = mode;
        setRoomModeState(mode);
        setSoundboardRoomEnabled(mode > 0);
        SendMessageComposer(new SoundboardSetEnabledComposer(mode));
    }, []);

    const setRoomEnabled = useCallback((value: boolean) => setRoomMode(value ? 1 : 0), [setRoomMode]);

    const reset = useCallback(() => {
        GetSoundManager().stopSoundboard();
        knownRoomModeRef.current = null;
        setRoomModeState(0);
        setServerSounds([]);
        setLegacySounds([]);
        setLayout(normalizeSoundboardLayout(null));
        setRecentSoundIds([]);
        setCooldownRemainingSeconds(0);
        setCooldownTotalSeconds(0);
        useSoundboardFeedStore.getState().clear();
        cooldownUntilRef.current = 0;
        cooldownSecondsRef.current = 0;
        legacyLoadStartedRef.current = false;
        setSoundboardRoomEnabled(false);
    }, []);

    return {
        enabled,
        roomMode,
        sounds,
        categories,
        recentSoundIds,
        favoriteIds,
        silencedUserIds,
        silenceUser,
        restoreSilencedUsers,
        cooldownRemainingSeconds,
        cooldownTotalSeconds,
        isCoolingDown,
        play,
        toggleFavorite,
        refresh,
        setRoomEnabled,
        setRoomMode,
        reset
    };
};

export const useSoundboard = () => useSharedHook(useSoundboardState);

registerSharedHook(useSoundboardState);

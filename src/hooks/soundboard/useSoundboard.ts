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
import { normalizeLegacySoundboardCatalog } from './soundboardLegacyCatalog';
import {
    DisplaySoundboardSound,
    mergeSoundboardPresentation,
    normalizeSoundboardLayout,
    pushRecentSound,
    SoundboardCategory,
    SoundboardLayout
} from './soundboardPresentation';
import { getRemainingCooldownSeconds, shouldStartOwnCooldown } from './soundboardUi.helpers';
import { resolveSoundboardSoundUrl } from './soundboardUrl';
import { useSoundboardManifest } from './useSoundboardManifest';

export type ClientSoundboardSound = DisplaySoundboardSound & { local?: boolean };

export const useSoundboardState = () => {
    const [enabled, setEnabled] = useState(false);
    const [serverSounds, setServerSounds] = useState<ISoundboardSound[]>([]);
    const [legacySounds, setLegacySounds] = useState<ISoundboardSound[]>([]);
    const [layout, setLayout] = useState<SoundboardLayout>(() => normalizeSoundboardLayout(null));
    const [recentSoundIds, setRecentSoundIds] = useState<number[]>([]);
    const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0);
    const cooldownSecondsRef = useRef(0);
    const cooldownUntilRef = useRef(0);
    const legacyLoadStartedRef = useRef(false);
    const { showSingleBubble } = useNotificationActions();
    const { manifest, manifestRef } = useSoundboardManifest();

    const showCooldownBubble = useCallback(
        (remainingSeconds: number) => {
            const seconds = Math.max(1, remainingSeconds);
            showSingleBubble(LocalizeText('soundboard.error.cooldown', ['seconds'], [seconds.toString()]), NotificationBubbleType.SOUNDBOARD);
        },
        [showSingleBubble]
    );

    const handleSettings = useCallback((event: SoundboardSettingsEvent) => {
        const parser = event.getParser();
        cooldownSecondsRef.current = Math.max(0, parser.cooldownSeconds);
        setEnabled(parser.enabled);
        setServerSounds(parser.sounds);
        setSoundboardRoomEnabled(parser.enabled);
    }, []);

    useMessageEvent<SoundboardSettingsEvent>(SoundboardSettingsEvent, handleSettings);

    const handleDenied = useCallback(
        (event: SoundboardPlayDeniedEvent) => {
            const parser = event.getParser();

            if (parser.reason === 1) {
                const seconds = Math.max(1, parser.remainingSeconds);
                const now = Date.now();
                cooldownUntilRef.current = now + seconds * 1_000;
                setCooldownRemainingSeconds(getRemainingCooldownSeconds(cooldownUntilRef.current, now));
                showCooldownBubble(seconds);
                return;
            }

            const key = parser.reason === 2 ? 'soundboard.error.room_disabled' : 'soundboard.error.unavailable';
            showSingleBubble(LocalizeText(key), NotificationBubbleType.SOUNDBOARD);
        },
        [showCooldownBubble, showSingleBubble]
    );

    useMessageEvent<SoundboardPlayDeniedEvent>(SoundboardPlayDeniedEvent, handleDenied);

    const handlePlay = useCallback(
        (event: SoundboardPlayEvent) => {
            const parser = event.getParser();
            void GetSoundManager()
                .playSoundboard(resolveSoundboardSoundUrl({ classname: parser.classname, url: parser.url }, manifestRef.current))
                .then((played) => {
                    if (!played) showSingleBubble(LocalizeText('soundboard.error.audio'), NotificationBubbleType.SOUNDBOARD);
                });
            setRecentSoundIds((current) => pushRecentSound(current, parser.soundId));
            DispatchUiEvent(new SoundboardRoomMessageEvent(parser.username, parser.soundName, parser.actorUserId, parser.actorRoomIndex));

            const ownUserId = GetSessionDataManager()?.getUserDataSnapshot?.().userId || -1;
            if (shouldStartOwnCooldown(parser.actorUserId, ownUserId, cooldownSecondsRef.current)) {
                const now = Date.now();
                cooldownUntilRef.current = now + cooldownSecondsRef.current * 1_000;
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
                    .playSoundboard(resolveSoundboardSoundUrl(sound, manifestRef.current))
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

    const refresh = useCallback(() => {
        SendMessageComposer(new SoundboardRequestSettingsComposer());
    }, []);

    const setRoomEnabled = useCallback((value: boolean) => {
        setEnabled(value);
        setSoundboardRoomEnabled(value);
        SendMessageComposer(new SoundboardSetEnabledComposer(value));
    }, []);

    const reset = useCallback(() => {
        GetSoundManager().stopSoundboard();
        setEnabled(false);
        setServerSounds([]);
        setLegacySounds([]);
        setLayout(normalizeSoundboardLayout(null));
        setRecentSoundIds([]);
        setCooldownRemainingSeconds(0);
        cooldownUntilRef.current = 0;
        cooldownSecondsRef.current = 0;
        legacyLoadStartedRef.current = false;
        setSoundboardRoomEnabled(false);
    }, []);

    return { enabled, sounds, categories, recentSoundIds, cooldownRemainingSeconds, isCoolingDown, play, refresh, setRoomEnabled, reset };
};

export const useSoundboard = () => useSharedHook(useSoundboardState);

registerSharedHook(useSoundboardState);

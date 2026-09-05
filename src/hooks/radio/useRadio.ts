import { loadGamedata } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, IsTouchDevice } from '../../api';

export type RadioStation = {
    id: string;
    name: string;
    genre?: string;
    url: string;
    logo?: string;
};

const RECONNECT_DELAYS_MS = [250, 1000, 3000, 8000];
const STABLE_PLAYBACK_RESET_MS = 10_000;

const useRadioState = () => {
    const [stations, setStations] = useState<RadioStation[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [volume, setVolumeState] = useState(0.05); // start quiet (5%) so autostart isn't intrusive
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const volumeRef = useRef(0.05);
    const intentRef = useRef<RadioStation | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimerRef = useRef<number | null>(null);
    const loadStartedRef = useRef(false);
    const autoStartedRef = useRef(false);
    const lastPlayingStartRef = useRef(0);
    const watchdogTimeRef = useRef({ time: -1, stuckTicks: 0 });

    useEffect(() => {
        if (loadStartedRef.current || IsTouchDevice()) return;
        loadStartedRef.current = true;

        const url = GetConfigurationValue<string>('radio.url') || GetConfigurationValue<string>('radio.stations.url') || 'configuration/radio-stations.jsonc';

        (async () => {
            try {
                const json = await loadGamedata<{ stations?: RadioStation[] }>(url);
                const list = Array.isArray(json?.stations) ? json.stations.filter((s) => s && s.id && s.url) : [];
                setStations(list);
            } catch (error) {
                setLoadError(String((error as Error)?.message ?? error));
            }
        })();
    }, []);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (!intentRef.current) return;
        if (reconnectTimerRef.current !== null) return;

        if (lastPlayingStartRef.current && Date.now() - lastPlayingStartRef.current >= STABLE_PLAYBACK_RESET_MS) {
            reconnectAttemptRef.current = 0;
            lastPlayingStartRef.current = 0;
        }

        const attempt = reconnectAttemptRef.current;

        if (attempt >= RECONNECT_DELAYS_MS.length) {
            setIsPlaying(false);
            return;
        }

        reconnectAttemptRef.current = attempt + 1;
        reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;

            const station = intentRef.current;
            const element = audioRef.current;

            if (!station || !element) return;

            element.src = station.url;
            element.load();
            void element
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => scheduleReconnect());
        }, RECONNECT_DELAYS_MS[attempt]);
    }, []);

    const ensureAudio = useCallback(() => {
        let audio = audioRef.current;

        if (audio) return audio;

        audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.style.display = 'none';
        audio.volume = volumeRef.current;
        audioRef.current = audio;
        document.body.appendChild(audio);

        audio.addEventListener('playing', () => {
            lastPlayingStartRef.current = Date.now();
            if (intentRef.current) setIsPlaying(true);
        });

        audio.addEventListener('ended', scheduleReconnect);
        audio.addEventListener('error', scheduleReconnect);
        audio.addEventListener('pause', () => {
            if (!intentRef.current) return;
            if (reconnectTimerRef.current !== null) return;
            setIsPlaying(false);
        });

        return audio;
    }, [scheduleReconnect]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            const audio = audioRef.current;
            const watch = watchdogTimeRef.current;

            if (!audio || !intentRef.current || audio.paused || reconnectTimerRef.current !== null) {
                watch.time = -1;
                watch.stuckTicks = 0;
                return;
            }

            if (audio.currentTime === watch.time) {
                watch.stuckTicks += 1;
                if (watch.stuckTicks >= 2) {
                    watch.time = -1;
                    watch.stuckTicks = 0;
                    scheduleReconnect();
                }
            } else {
                watch.time = audio.currentTime;
                watch.stuckTicks = 0;
            }
        }, 2500);

        return () => window.clearInterval(interval);
    }, [scheduleReconnect]);

    useEffect(
        () => () => {
            clearReconnectTimer();
            intentRef.current = null;
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeAttribute('src');
                audioRef.current.remove();
                audioRef.current = null;
            }
        },
        [clearReconnectTimer]
    );

    const stop = useCallback(() => {
        clearReconnectTimer();
        reconnectAttemptRef.current = 0;
        intentRef.current = null;

        const audio = audioRef.current;

        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        }

        setIsPlaying(false);
        setCurrentId(null);
    }, [clearReconnectTimer]);

    const armResumeOnGesture = useCallback(() => {
        const resume = () => {
            window.removeEventListener('pointerdown', resume);
            window.removeEventListener('keydown', resume);
            if (audioRef.current && intentRef.current)
                void audioRef.current
                    .play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {});
        };
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
    }, []);

    const play = useCallback(
        (station: RadioStation) => {
            if (!station?.url || IsTouchDevice()) return;

            clearReconnectTimer();
            reconnectAttemptRef.current = 0;

            try {
                const audio = ensureAudio();

                intentRef.current = station;
                audio.src = station.url;
                audio.volume = volumeRef.current;
                audio.load();
                setCurrentId(station.id);
                void audio
                    .play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        setIsPlaying(false);
                        armResumeOnGesture();
                    });
            } catch {
                intentRef.current = null;
                setIsPlaying(false);
                setCurrentId(null);
            }
        },
        [ensureAudio, clearReconnectTimer, armResumeOnGesture]
    );

    useEffect(() => {
        if (autoStartedRef.current || !stations.length) return;
        autoStartedRef.current = true;
        play(stations[0]);
    }, [stations, play]);

    const toggle = useCallback(
        (station: RadioStation) => {
            if (currentId === station.id) stop();
            else play(station);
        },
        [currentId, play, stop]
    );

    const setVolume = useCallback((value: number) => {
        const v = Math.max(0, Math.min(1, value));
        volumeRef.current = v;
        setVolumeState(v);
        if (audioRef.current) audioRef.current.volume = v;
    }, []);

    return { stations, currentId, isPlaying, volume, loadError, play, stop, toggle, setVolume };
};

export const useRadio = () => useSharedHook(useRadioState);

registerSharedHook(useRadioState);

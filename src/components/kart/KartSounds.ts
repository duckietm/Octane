import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * HabboKart's sounds, made by the browser (Web Audio): no recording to load, nothing taken from another game. The
 * engine (two oscillators through a filter, its pitch following the speed), the tyres' squeal in a drift, the grass,
 * the start's beeps, the "?" boxes, the items, a hit, the laps, the finish, and a short chiptune loop written for the
 * game. Music and effects each have their switch, kept in the browser.
 */

const MUSIC_KEY = 'octane.kart.music';
const EFFECTS_KEY = 'octane.kart.effects';

const readSwitch = (key: string): boolean => {
    try {
        return window.localStorage?.getItem(key) !== '0';
    } catch {
        return true;
    }
};

const NOTE = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

// The loop: 4 bars of 16 steps at 150 beats a minute; lead and bass as MIDI notes (0: rest).
const STEP_S = 60 / 150 / 4;
const LEAD = [
    76, 0, 79, 0, 84, 0, 83, 81, 79, 0, 76, 0, 79, 0, 0, 0,
    77, 0, 81, 0, 84, 0, 83, 81, 79, 0, 77, 0, 74, 0, 0, 0,
    76, 0, 79, 0, 84, 0, 86, 88, 86, 0, 84, 0, 81, 0, 83, 0,
    84, 0, 83, 0, 81, 0, 79, 0, 76, 0, 79, 0, 84, 0, 0, 0
];
const BASS = [ 48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 55, 55, 53, 53, 55, 43 ];

interface IEngine {
    saw: OscillatorNode;
    sub: OscillatorNode;
    filter: BiquadFilterNode;
    gain: GainNode;
    squeal: GainNode;
    rumble: GainNode;
    sources: AudioScheduledSourceNode[];
}

export interface IKartSounds {
    music: boolean;
    effects: boolean;
    toggleMusic: () => void;
    toggleEffects: () => void;
    /** The engine, each frame: speed (px/s, negative backwards), drifting, on the grass; null stops it. */
    engine: (state: { speed: number; drifting: boolean; offRoad: boolean } | null) => void;
    beep: (go: boolean) => void;
    pickup: () => void;
    item: (name: string) => void;
    boost: () => void;
    hit: () => void;
    lap: (last: boolean) => void;
    finish: (first: boolean) => void;
    /** The music on (during a race) or off. */
    playMusic: (on: boolean) => void;
}

export const useKartSounds = (): IKartSounds => {
    const [ music, setMusic ] = useState(() => readSwitch(MUSIC_KEY));
    const [ effects, setEffects ] = useState(() => readSwitch(EFFECTS_KEY));
    const contextRef = useRef<AudioContext | null>(null);
    const mainRef = useRef<GainNode | null>(null);
    const noiseRef = useRef<AudioBuffer | null>(null);
    const engineRef = useRef<IEngine | null>(null);
    const musicTimer = useRef(0);
    const musicWanted = useRef(false);
    const effectsRef = useRef(effects);
    const musicRef = useRef(music);

    effectsRef.current = effects;
    musicRef.current = music;

    const context = useCallback((): AudioContext | null => {
        if (!contextRef.current) {
            const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

            if (!Context) return null;

            const created = new Context();
            const main = created.createGain();
            const noise = created.createBuffer(1, created.sampleRate, created.sampleRate);
            const data = noise.getChannelData(0);

            for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;

            main.gain.value = 0.5;
            main.connect(created.destination);
            contextRef.current = created;
            mainRef.current = main;
            noiseRef.current = noise;
        }

        if (contextRef.current.state === 'suspended') contextRef.current.resume().catch(() => undefined);

        return contextRef.current;
    }, []);

    /** A short note: its wave, from one pitch to another, its volume and length. */
    const tone = useCallback((type: OscillatorType, from: number, to: number, volume: number, length: number, delay = 0) => {
        const audio = context();

        if (!audio || !effectsRef.current) return;

        const at = audio.currentTime + delay;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(from, at);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
        gain.gain.setValueAtTime(volume, at);
        gain.gain.exponentialRampToValueAtTime(0.001, at + length);
        oscillator.connect(gain).connect(mainRef.current);
        oscillator.start(at);
        oscillator.stop(at + length + 0.02);
    }, [ context ]);

    /** A burst of noise through a filter: a whoosh, a splat, a crash. */
    const noise = useCallback((type: BiquadFilterType, from: number, to: number, volume: number, length: number, delay = 0) => {
        const audio = context();

        if (!audio || !effectsRef.current || !noiseRef.current) return;

        const at = audio.currentTime + delay;
        const source = audio.createBufferSource();
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();

        source.buffer = noiseRef.current;
        source.loop = true;
        filter.type = type;
        filter.Q.value = 2;
        filter.frequency.setValueAtTime(from, at);
        filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
        gain.gain.setValueAtTime(volume, at);
        gain.gain.exponentialRampToValueAtTime(0.001, at + length);
        source.connect(filter).connect(gain).connect(mainRef.current);
        source.start(at);
        source.stop(at + length + 0.02);
    }, [ context ]);

    const stopEngine = useCallback(() => {
        const engine = engineRef.current;

        if (!engine) return;

        engineRef.current = null;

        const audio = contextRef.current;
        const at = audio?.currentTime ?? 0;

        engine.gain.gain.setTargetAtTime(0, at, 0.08);
        engine.squeal.gain.setTargetAtTime(0, at, 0.05);
        engine.rumble.gain.setTargetAtTime(0, at, 0.05);
        engine.sources.forEach((source) => source.stop(at + 0.4));
    }, []);

    const engine = useCallback((state: { speed: number; drifting: boolean; offRoad: boolean } | null) => {
        if (!state || !effectsRef.current) {
            stopEngine();
            return;
        }

        const audio = context();

        if (!audio || !mainRef.current || !noiseRef.current) return;

        if (!engineRef.current) {
            const saw = audio.createOscillator();
            const sub = audio.createOscillator();
            const filter = audio.createBiquadFilter();
            const gain = audio.createGain();
            const squealSource = audio.createBufferSource();
            const squealFilter = audio.createBiquadFilter();
            const squeal = audio.createGain();
            const rumbleSource = audio.createBufferSource();
            const rumbleFilter = audio.createBiquadFilter();
            const rumble = audio.createGain();

            saw.type = 'sawtooth';
            sub.type = 'square';
            filter.type = 'lowpass';
            filter.Q.value = 4;
            gain.gain.value = 0;
            saw.connect(filter);
            sub.connect(filter);
            filter.connect(gain).connect(mainRef.current);

            squealSource.buffer = noiseRef.current;
            squealSource.loop = true;
            squealFilter.type = 'bandpass';
            squealFilter.frequency.value = 2600;
            squealFilter.Q.value = 9;
            squeal.gain.value = 0;
            squealSource.connect(squealFilter).connect(squeal).connect(mainRef.current);

            rumbleSource.buffer = noiseRef.current;
            rumbleSource.loop = true;
            rumbleFilter.type = 'lowpass';
            rumbleFilter.frequency.value = 260;
            rumble.gain.value = 0;
            rumbleSource.connect(rumbleFilter).connect(rumble).connect(mainRef.current);

            [ saw, sub, squealSource, rumbleSource ].forEach((source) => source.start());
            engineRef.current = { saw, sub, filter, gain, squeal, rumble, sources: [ saw, sub, squealSource, rumbleSource ] };
        }

        const parts = engineRef.current;
        const at = audio.currentTime;
        const speed = Math.min(1.6, Math.abs(state.speed) / 420);
        // Idle at 46 Hz, up to ~150 Hz at full speed (and a little more with a turbo).
        const pitch = 46 + speed * 66;

        parts.saw.frequency.setTargetAtTime(pitch, at, 0.06);
        parts.sub.frequency.setTargetAtTime(pitch / 2, at, 0.06);
        parts.filter.frequency.setTargetAtTime(300 + speed * 900, at, 0.08);
        parts.gain.gain.setTargetAtTime(0.06 + speed * 0.07, at, 0.08);
        parts.squeal.gain.setTargetAtTime(state.drifting ? 0.07 : 0, at, 0.04);
        parts.rumble.gain.setTargetAtTime(state.offRoad && speed > 0.1 ? 0.25 : 0, at, 0.06);
    }, [ context, stopEngine ]);

    const beep = useCallback((go: boolean) => tone('square', go ? 880 : 440, go ? 880 : 440, 0.12, go ? 0.7 : 0.22), [ tone ]);

    // A "?" box: the items rolling, then a ding.
    const pickup = useCallback(() => {
        [ 0, 1, 2, 3, 4, 5 ].forEach((step) => tone('square', NOTE(72 + ((step * 5) % 12)), NOTE(72 + ((step * 5) % 12)), 0.05, 0.06, step * 0.06));
        tone('triangle', NOTE(84), NOTE(84), 0.12, 0.35, 0.38);
    }, [ tone ]);

    const item = useCallback((name: string) => {
        if (name === 'shell') {
            tone('square', 900, 180, 0.08, 0.25);
            noise('bandpass', 3000, 600, 0.12, 0.25);
        } else if (name === 'banana') {
            tone('sine', 300, 90, 0.18, 0.18);
            noise('lowpass', 900, 200, 0.12, 0.12);
        }
    }, [ tone, noise ]);

    const boost = useCallback(() => {
        noise('bandpass', 400, 4000, 0.22, 0.6);
        tone('sawtooth', 120, 480, 0.06, 0.6);
    }, [ tone, noise ]);

    const hit = useCallback(() => {
        noise('lowpass', 1800, 120, 0.3, 0.4);
        [ 0, 1, 2, 3 ].forEach((step) => tone('square', 700 - step * 120, 500 - step * 110, 0.06, 0.12, step * 0.12));
    }, [ tone, noise ]);

    const lap = useCallback((last: boolean) => {
        const notes = last ? [ 72, 76, 79, 84, 88 ] : [ 76, 84 ];

        notes.forEach((n, step) => tone('square', NOTE(n), NOTE(n), 0.07, 0.16, step * 0.11));
    }, [ tone ]);

    const finish = useCallback((first: boolean) => {
        const notes = first ? [ 67, 72, 76, 79, 76, 79, 84 ] : [ 72, 71, 69, 67 ];

        notes.forEach((n, step) => tone(first ? 'square' : 'triangle', NOTE(n), NOTE(n), 0.08, step === notes.length - 1 ? 0.7 : 0.16, step * 0.15));
    }, [ tone ]);

    // The music: notes scheduled a little ahead, bar after bar.
    const startLoop = useCallback(() => {
        window.clearInterval(musicTimer.current);
        musicTimer.current = 0;

        if (!musicWanted.current || !musicRef.current) return;

        const audio = context();

        if (!audio || !mainRef.current) return;

        const bus = audio.createGain();

        bus.gain.value = 0.35;
        bus.connect(mainRef.current);

        let step = 0;
        let next = audio.currentTime + 0.1;
        const play = (type: OscillatorType, midi: number, at: number, length: number, volume: number) => {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();

            oscillator.type = type;
            oscillator.frequency.value = NOTE(midi);
            gain.gain.setValueAtTime(volume, at);
            gain.gain.exponentialRampToValueAtTime(0.001, at + length);
            oscillator.connect(gain).connect(bus);
            oscillator.start(at);
            oscillator.stop(at + length + 0.02);
        };

        musicTimer.current = window.setInterval(() => {
            if (!musicWanted.current || !musicRef.current) {
                bus.gain.setTargetAtTime(0, audio.currentTime, 0.1);
                window.clearInterval(musicTimer.current);
                musicTimer.current = 0;
                return;
            }

            while (next < audio.currentTime + 0.25) {
                const lead = LEAD[step % LEAD.length];

                if (lead) play('square', lead, next, STEP_S * 1.8, 0.05);
                if (step % 4 === 0) play('triangle', BASS[Math.floor(step / 4) % BASS.length], next, STEP_S * 3.5, 0.16);
                if (step % 2 === 1) {
                    const source = audio.createBufferSource();
                    const filter = audio.createBiquadFilter();
                    const gain = audio.createGain();

                    source.buffer = noiseRef.current;
                    filter.type = 'highpass';
                    filter.frequency.value = 7000;
                    gain.gain.setValueAtTime(0.05, next);
                    gain.gain.exponentialRampToValueAtTime(0.001, next + 0.04);
                    source.connect(filter).connect(gain).connect(bus);
                    source.start(next);
                    source.stop(next + 0.05);
                }

                next += STEP_S;
                step++;
            }
        }, 60);
    }, [ context ]);

    const playMusic = useCallback((on: boolean) => {
        if (musicWanted.current === on && (!on || musicTimer.current)) return;

        musicWanted.current = on;
        startLoop();
    }, [ startLoop ]);

    const toggleMusic = useCallback(() => setMusic((value) => {
        const next = !value;

        try {
            window.localStorage?.setItem(MUSIC_KEY, next ? '1' : '0');
        } catch {
            // Private browsing: the switch is not kept.
        }

        musicRef.current = next;
        startLoop();

        return next;
    }), [ startLoop ]);

    const toggleEffects = useCallback(() => setEffects((value) => {
        const next = !value;

        try {
            window.localStorage?.setItem(EFFECTS_KEY, next ? '1' : '0');
        } catch {
            // Private browsing: the switch is not kept.
        }

        effectsRef.current = next;
        if (!next) stopEngine();

        return next;
    }), [ stopEngine ]);

    useEffect(() => () => {
        window.clearInterval(musicTimer.current);
        stopEngine();
        contextRef.current?.close().catch(() => undefined);
        contextRef.current = null;
    }, [ stopEngine ]);

    return { music, effects, toggleMusic, toggleEffects, engine, beep, pickup, item, boost, hit, lap, finish, playMusic };
};

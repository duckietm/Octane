import { Game2ExitGameMessageComposer } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, resolveGameFrame, SendMessageComposer } from '../../../api';
import { useGameCenter } from '../../../hooks';

export const GameStageView = () => {
    const { gameURL, setGameURL } = useGameCenter();
    const [loadTimes, setLoadTimes] = useState<number>(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref || (ref && !ref.current)) return;

        setLoadTimes(0);
        ref.current.innerHTML = '';

        const allowedHosts = GetConfigurationValue<string[]>('game.center.allowed.hosts', []);
        const settings = resolveGameFrame(gameURL ?? '', Array.isArray(allowedHosts) ? allowedHosts : [], window.location.origin);

        if (!settings) return;

        const frame: HTMLIFrameElement = document.createElement('iframe');

        frame.setAttribute('sandbox', settings.sandbox);
        frame.referrerPolicy = 'no-referrer';
        frame.src = settings.src;
        frame.classList.add('game-center-stage');
        frame.classList.add('h-full');

        frame.onload = () => {
            setLoadTimes((prev) => (prev += 1));
        };

        ref.current.appendChild(frame);
    }, [ref, gameURL]);

    useEffect(() => {
        if (loadTimes > 1) {
            setGameURL(null);
            SendMessageComposer(new Game2ExitGameMessageComposer());
        }
    }, [loadTimes, setGameURL]);

    if (!gameURL) return null;

    return <div ref={ref} className="game-center-stage" />;
};

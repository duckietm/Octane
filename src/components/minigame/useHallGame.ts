import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { HallApi, HallGameName, IHallTable, IHallView, hallErrorText } from '../../api';

const POLL_LOBBY_MS = 3000;
const POLL_TABLE_MS = 1000;

export interface IHallGame {
    visible: boolean;
    close: () => void;
    view: IHallView | null;
    table: IHallTable | undefined;
    error: string;
    busy: boolean;
    run: (action: () => Promise<IHallView>) => Promise<void>;
    /** A move sent without blocking the buttons (a game played in real time). */
    send: (move: Record<string, unknown>) => void;
    setView: (view: IHallView) => void;
    /** When the last answer came (performance.now()), to count a time down between two answers. */
    receivedRef: MutableRefObject<number>;
}

/**
 * A game with its own world that runs on the server's tables (`/api/hall`): opened by the link `<prefix>/show`,
 * it asks for the table every `playingMs` while a game is on (one request at a time), every second at a table,
 * every three seconds out of one.
 */
export const useHallGame = (game: HallGameName, prefix: string, playingMs: number): IHallGame => {
    const [ visible, setVisible ] = useState(false);
    const [ view, setViewState ] = useState<IHallView | null>(null);
    const [ error, setError ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const busyRef = useRef(false);
    const pollingRef = useRef(false);
    const receivedRef = useRef(0);

    const setView = useCallback((next: IHallView) => {
        receivedRef.current = performance.now();
        setViewState(next);
    }, []);

    const refresh = useCallback(() => {
        if (busyRef.current || pollingRef.current) return;

        pollingRef.current = true;
        HallApi.view(game)
            .then(setView)
            .catch((caught) => setError(hallErrorText(caught) ?? ''))
            .finally(() => {
                pollingRef.current = false;
            });
    }, [ game, setView ]);

    const run = useCallback(async (action: () => Promise<IHallView>) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError('');

        try {
            setView(await action());
        } catch (caught) {
            setError(hallErrorText(caught) ?? '');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, [ setView ]);

    const send = useCallback((move: Record<string, unknown>) => {
        HallApi.move(game, move).then(setView).catch((caught) => {
            const text = hallErrorText(caught);

            if (text && !(caught instanceof Error && caught.message === 'http_error')) setError(text);
        });
    }, [ game, setView ]);

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const action = url.split('/')[1];

                if (action === 'show') setVisible(true);
                else if (action === 'hide') setVisible(false);
                else if (action === 'toggle') setVisible((value) => !value);
            },
            eventUrlPrefix: `${prefix}/`
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, [ prefix ]);

    const table = view?.table;
    const playing = table?.state === 'playing';

    useEffect(() => {
        if (!visible) return;

        refresh();

        const timer = setInterval(refresh, playing ? playingMs : table ? POLL_TABLE_MS : POLL_LOBBY_MS);

        return () => clearInterval(timer);
    }, [ visible, !!table, playing, playingMs, refresh ]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => setError(''), 4000);

        return () => clearTimeout(timer);
    }, [ error ]);

    return { visible, close: () => setVisible(false), view, table, error, busy, run, send, setView, receivedRef };
};

/** The zoom of a game's stage: whole when the screen has room for it, smaller only when it has not. */
export const useStageZoom = (width: number, height: number, topBar = 44): number => {
    const read = () => {
        if (typeof window === 'undefined') return 1;

        const ratio = Math.min(window.innerWidth / width, (window.innerHeight - topBar) / height);

        return ratio >= 1 ? Math.floor(ratio) : Math.max(0.5, ratio);
    };
    const [ zoom, setZoom ] = useState(read);

    useEffect(() => {
        const onResize = () => setZoom(read());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, [ width, height ]);

    return zoom;
};

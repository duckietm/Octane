import { ITraxEditorSong } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';

type PendingAction = 'buy' | 'save' | null;

interface TraxSongRequestsOptions
{
    songs: ITraxEditorSong[];
    errorCount: number;
    buySong: (name: string) => void;
    saveSong: (songId: number, name: string, data: string) => void;
    /** The song a buy added, to open it. */
    onBought: (song: ITraxEditorSong) => void;
    /** A save the server refused: the song is still unsaved. */
    onSaveRefused: () => void;
}

/** How long a buy or save waits for the server before its button is released anyway. */
export const TRAX_REQUEST_TIMEOUT_MS = 15000;

/**
 * The buy or save waiting for the server's answer, which is the song list or an error. The buy had no guard, so a
 * double click paid twice; a refused buy left a flag that later opened the last song over the one being edited; and
 * a refused save left Save disabled with the work unsaved.
 */
export const useTraxSongRequests = ({ songs, errorCount, buySong, saveSong, onBought, onSaveRefused }: TraxSongRequestsOptions) =>
{
    const pendingRef = useRef<PendingAction>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const songCountAtBuyRef = useRef(0);
    const seenSongsRef = useRef(songs);
    const seenErrorCountRef = useRef(errorCount);
    const onBoughtRef = useRef(onBought);
    const onSaveRefusedRef = useRef(onSaveRefused);

    onBoughtRef.current = onBought;
    onSaveRefusedRef.current = onSaveRefused;

    const settle = useCallback(() =>
    {
        const action = pendingRef.current;

        pendingRef.current = null;
        setPendingAction(null);

        return action;
    }, []);

    useEffect(() =>
    {
        if (seenSongsRef.current === songs) return;

        seenSongsRef.current = songs;

        // Only a buy that added a song opens it.
        if (settle() === 'buy' && songs.length > songCountAtBuyRef.current) onBoughtRef.current(songs[songs.length - 1]);
    }, [songs, settle]);

    useEffect(() =>
    {
        if (seenErrorCountRef.current === errorCount) return;

        seenErrorCountRef.current = errorCount;

        if (settle() === 'save') onSaveRefusedRef.current();
    }, [errorCount, settle]);

    useEffect(() =>
    {
        if (!pendingAction) return;

        const timeout = setTimeout(settle, TRAX_REQUEST_TIMEOUT_MS);

        return () => clearTimeout(timeout);
    }, [pendingAction, settle]);

    /** False when another request is still waiting: the click is ignored. */
    const buy = useCallback((name: string) =>
    {
        if (pendingRef.current) return false;

        pendingRef.current = 'buy';
        setPendingAction('buy');
        songCountAtBuyRef.current = seenSongsRef.current.length;
        buySong(name);

        return true;
    }, [buySong]);

    const save = useCallback((songId: number, name: string, data: string) =>
    {
        if (pendingRef.current) return false;

        pendingRef.current = 'save';
        setPendingAction('save');
        saveSong(songId, name, data);

        return true;
    }, [saveSong]);

    return { pendingAction, buy, save };
};

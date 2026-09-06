import { GetTraxEditorSongsComposer, ITraxEditorSong, TraxEditorBuySongComposer, TraxEditorDeleteSongComposer, TraxEditorErrorEvent, TraxEditorSaveSongComposer, TraxEditorSongsEvent } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

const useTraxEditorState = () =>
{
    const [songs, setSongs] = useState<ITraxEditorSong[]>([]);
    const [maxSongs, setMaxSongs] = useState(0);
    const [costCurrency, setCostCurrency] = useState(-1);
    const [costAmount, setCostAmount] = useState(0);
    const [lastError, setLastError] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useMessageEvent<TraxEditorSongsEvent>(TraxEditorSongsEvent, (event) =>
    {
        const parser = event.getParser();

        setMaxSongs(parser.maxSongs);
        setCostCurrency(parser.costCurrency);
        setCostAmount(parser.costAmount);
        setSongs(parser.songs);
        setLastError(0);
        setLoaded(true);
    });

    useMessageEvent<TraxEditorErrorEvent>(TraxEditorErrorEvent, (event) =>
    {
        setLastError(event.getParser().errorCode);
    });

    const requestSongs = useCallback(() => SendMessageComposer(new GetTraxEditorSongsComposer()), []);

    const buySong = useCallback((name: string) => SendMessageComposer(new TraxEditorBuySongComposer(name)), []);

    const saveSong = useCallback((songId: number, name: string, data: string) => SendMessageComposer(new TraxEditorSaveSongComposer(songId, name, data)), []);

    const deleteSong = useCallback((songId: number) => SendMessageComposer(new TraxEditorDeleteSongComposer(songId)), []);

    const clearError = useCallback(() => setLastError(0), []);

    return { songs, maxSongs, costCurrency, costAmount, lastError, loaded, requestSongs, buySong, saveSong, deleteSong, clearError };
};

export const useTraxEditor = () => useSharedHook(useTraxEditorState);

registerSharedHook(useTraxEditorState);

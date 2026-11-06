/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TRAX_REQUEST_TIMEOUT_MS, useTraxSongRequests } from './useTraxSongRequests';

const song = (id: number) => ({ id, name: `song ${id}`, data: '', length: 0 }) as any;

const setup = (songs: any[] = [song(1)]) =>
{
    const buySong = vi.fn();
    const saveSong = vi.fn();
    const onBought = vi.fn();
    const onSaveRefused = vi.fn();
    const hook = renderHook((props: { songs: any[]; errorCount: number }) =>
        useTraxSongRequests({ ...props, buySong, saveSong, onBought, onSaveRefused }), { initialProps: { songs, errorCount: 0 } });

    return { hook, buySong, saveSong, onBought, onSaveRefused };
};

afterEach(() => vi.useRealTimers());

describe('useTraxSongRequests', () =>
{
    it('buys once however many times New song is clicked', () =>
    {
        const { hook, buySong } = setup();

        act(() =>
        {
            hook.result.current.buy('new');
            hook.result.current.buy('new');
        });

        // A double click used to pay twice.
        expect(buySong).toHaveBeenCalledTimes(1);
        expect(hook.result.current.pendingAction).toBe('buy');
    });

    it('opens the bought song once the list grows', () =>
    {
        const { hook, onBought } = setup([song(1)]);

        act(() => void hook.result.current.buy('new'));
        hook.rerender({ songs: [song(1), song(2)], errorCount: 0 });

        expect(onBought).toHaveBeenCalledWith(song(2));
        expect(hook.result.current.pendingAction).toBeNull();
    });

    it('a refused buy opens nothing, even when a later list arrives', () =>
    {
        const songs = [song(1)];
        const { hook, onBought } = setup(songs);

        act(() => void hook.result.current.buy('new'));
        hook.rerender({ songs, errorCount: 1 });
        // Reopening the editor asks for the songs again: that list used to replace the song being edited.
        hook.rerender({ songs: [song(1)], errorCount: 1 });

        expect(onBought).not.toHaveBeenCalled();
        expect(hook.result.current.pendingAction).toBeNull();
    });

    it('a refused save is reported as unsaved', () =>
    {
        const songs = [song(1)];
        const { hook, saveSong, onSaveRefused } = setup(songs);

        act(() => void hook.result.current.save(1, 'mine', 'data'));
        // An error reply comes without a new song list.
        hook.rerender({ songs, errorCount: 1 });

        expect(saveSong).toHaveBeenCalledWith(1, 'mine', 'data');
        expect(onSaveRefused).toHaveBeenCalledTimes(1);
    });

    it('a save answered with the song list is not reported as refused', () =>
    {
        const { hook, onSaveRefused } = setup();

        act(() => void hook.result.current.save(1, 'mine', 'data'));
        hook.rerender({ songs: [song(1)], errorCount: 0 });

        expect(onSaveRefused).not.toHaveBeenCalled();
        expect(hook.result.current.pendingAction).toBeNull();
    });

    it('releases the button when no answer comes', () =>
    {
        vi.useFakeTimers();
        const { hook } = setup();

        act(() => void hook.result.current.buy('new'));
        act(() => void vi.advanceTimersByTime(TRAX_REQUEST_TIMEOUT_MS));

        expect(hook.result.current.pendingAction).toBeNull();
    });
});

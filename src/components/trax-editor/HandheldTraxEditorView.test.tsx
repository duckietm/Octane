import * as Renderer from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const music = vi.hoisted(() => ({
    previewSample: vi.fn(() => Promise.resolve()),
    stopSamplePreview: vi.fn(),
    stopPreview: vi.fn(),
    previewTraxData: vi.fn(() => Promise.resolve())
}));
const editor = vi.hoisted(() => ({ saveSong: vi.fn(), buySong: vi.fn(), deleteSong: vi.fn(), showConfirm: vi.fn() }));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetSoundManager: () => ({ musicController: music }),
    SoundManagerEvent: { TRAX_SONG_COMPLETE: 'trax_song_complete' }
}));

vi.mock('../../hooks', async (importOriginal) => {
    const original = await importOriginal<Record<string, unknown>>();
    const { useTraxSongRequests } = await import('../../hooks/traxeditor/useTraxSongRequests');

    return {
        ...original,
        useTraxSongRequests,
        useTraxEditor: () => ({
            songs: [{ id: 1, name: 'Summer jam', data: '1:1,2;0,2;4,4:2:10,4;0,2;12,2:3:0,4;21,2:4:30,1;0,1;30,1:', length: 16 }],
            maxSongs: 3,
            costCurrency: 0,
            costAmount: 0,
            lastError: 0,
            errorCount: 0,
            loaded: true,
            requestSongs: () => undefined,
            buySong: editor.buySong,
            saveSong: editor.saveSong,
            deleteSong: editor.deleteSong,
            clearError: () => undefined
        }),
        usePurse: () => ({ getCurrencyAmount: () => 0 }),
        useNotification: () => ({ showConfirm: editor.showConfirm }),
        useOctaneEvent: () => undefined
    };
});

const { TraxEditorView } = await import('./TraxEditorView');

const open = () => {
    render(<TraxEditorView />);

    const calls = (Renderer.AddLinkEventTracker as unknown as { mock: { calls: { eventUrlPrefix: string; linkReceived: (url: string) => void }[][] } }).mock
        .calls;
    const tracker = [...calls].reverse().find(([value]) => value?.eventUrlPrefix === 'trax-editor/')?.[0];

    act(() => tracker?.linkReceived('trax-editor/show'));
};

const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

describe('trax machine on a phone', () => {
    beforeEach(() => {
        for (const spy of [...Object.values(music), ...Object.values(editor)]) spy.mockClear();
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('lists the songs first and opens one in the editor, with a way back to the list', () => {
        phone();
        open();

        expect(screen.getByTestId('handheld-trax-songs')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Summer jam/ }));

        expect(screen.getByTestId('handheld-trax-editor')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Song name' })).toHaveValue('Summer jam');

        fireEvent.click(screen.getByRole('button', { name: 'My songs' }));
        expect(screen.getByTestId('handheld-trax-songs')).toBeInTheDocument();
    });

    it('places the chosen sound where the track is tapped and saves the song through the same request', () => {
        phone();
        open();
        fireEvent.click(screen.getByRole('button', { name: /Summer jam/ }));

        const save = screen.getByRole('button', { name: 'Save' });

        expect(save).toBeDisabled();
        // A 36 px cell: the tap at x = 80 is unit 2 of track 1 (sound #1 of its set, one unit long).
        fireEvent.click(screen.getByTestId('trax-channel-0'), { clientX: 80 });
        expect(within(screen.getByTestId('trax-channel-0')).getAllByText('1')).toHaveLength(2);

        expect(save).not.toBeDisabled();
        fireEvent.click(save);
        expect(editor.saveSong).toHaveBeenCalledWith(1, 'Summer jam', expect.stringContaining('1:1,2;1,1;0,1;4,4:'));
    });

    it('takes a block away on a tap while Erase is on, and places nothing then', () => {
        phone();
        open();
        fireEvent.click(screen.getByRole('button', { name: /Summer jam/ }));

        const track = screen.getByTestId('trax-channel-0');

        fireEvent.click(screen.getByRole('button', { name: /Erase/ }));
        fireEvent.click(track, { clientX: 80 });
        expect(within(track).queryAllByText('1')).toHaveLength(1);

        fireEvent.click(within(track).getByText('4'));
        expect(within(track).queryByText('4')).toBeNull();
    });

    it('loads a sound set from its tile page into the chosen track and auditions a sound of it', () => {
        phone();
        open();
        fireEvent.click(screen.getByRole('button', { name: /Summer jam/ }));
        fireEvent.click(screen.getByRole('button', { name: /Track 2/ }));
        fireEvent.click(screen.getByTestId('trax-open-sets'));

        expect(screen.getByTestId('handheld-trax-sets')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Dark Skies/ }));

        expect(screen.getByRole('button', { name: /Track 2: Dark Skies/ })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: '#3, 4s' }));
        // Set 5, sound 3: sample 39.
        expect(music.previewSample).toHaveBeenCalledWith(39);
    });

    it('plays the song from the transport bar', () => {
        phone();
        open();
        fireEvent.click(screen.getByRole('button', { name: /Summer jam/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));

        expect(music.previewTraxData).toHaveBeenCalledTimes(1);
    });

    it('keeps the desktop machine when not on a phone', () => {
        open();

        expect(screen.queryByTestId('handheld-trax-songs')).toBeNull();
        expect(screen.getByText('Summer jam')).toBeInTheDocument();
    });
});

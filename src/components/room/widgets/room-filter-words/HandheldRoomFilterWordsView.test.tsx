import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const h = vi.hoisted(() => ({
    sent: [] as { args: unknown[] }[],
    words: [] as string[],
    closed: 0
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    UpdateRoomFilterMessageComposer: class {
        args: unknown[];
        constructor(...args: unknown[]) {
            this.args = args;
        }
    }
}));

vi.mock('../../../../api', async () => ({
    ...(await vi.importActual<typeof import('../../../../api')>('../../../../api')),
    SendMessageComposer: (composer: { args: unknown[] }) => h.sent.push(composer)
}));
vi.mock('../../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../../../api/utils/localizeWithFallback', () => ({
    localizeWithFallback: (_key: string, fallback: string, params: string[] = [], values: string[] = []) =>
        (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback)
}));

vi.mock('../../../../hooks', async () => {
    const { useState } = await import('react');

    return {
        ...(await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks')),
        useFilterWordsWidget: () => {
            const [wordsFilter, setWordsFilter] = useState<string[]>(h.words);

            return { wordsFilter, isVisible: true, setWordsFilter, onClose: () => (h.closed += 1) };
        },
        useNavigatorData: () => ({ navigatorData: { enteredGuestRoom: { roomId: 77 } } })
    };
});

import { RoomFilterWordsWidgetView } from './RoomFilterWordsWidgetView';

const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

describe('room word filter on a phone', () => {
    afterEach(() => {
        cleanup();
        h.sent.length = 0;
        h.closed = 0;
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('adds the typed word and removes a word from its own card', () => {
        h.words = ['spam', 'bobba'];
        phone();
        render(<RoomFilterWordsWidgetView />);

        expect(screen.getByText('Filtered words (2)')).not.toBeNull();

        fireEvent.change(screen.getByRole('textbox', { name: 'Word to filter' }), { target: { value: 'sale' } });
        fireEvent.click(screen.getByRole('button', { name: 'navigator.roomsettings.roomfilter.addword' }));

        expect(h.sent[0].args).toEqual([77, true, 'sale']);
        expect(screen.getByText('sale')).not.toBeNull();
        // The field starts again from the desktop's default word.
        expect((screen.getByRole('textbox', { name: 'Word to filter' }) as HTMLInputElement).value).toBe('bobba');

        fireEvent.click(screen.getByRole('button', { name: 'navigator.roomsettings.roomfilter.removeword: spam' }));

        expect(h.sent[1].args).toEqual([77, false, 'spam']);
        expect(screen.queryByText('spam')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));
        expect(h.closed).toBe(1);
    });

    it('keeps the desktop window off the phone', () => {
        h.words = ['spam'];
        render(<RoomFilterWordsWidgetView />);

        expect(document.querySelector('.octane-room-filter-words')).not.toBeNull();
        expect(screen.queryByTestId('room-filter')).toBeNull();

        // The desktop removes a selected word with its own button.
        fireEvent.click(screen.getByText('spam'));
        fireEvent.click(screen.getByText('navigator.roomsettings.roomfilter.removeword'));
        expect(h.sent[0].args).toEqual([77, false, 'spam']);
    });
});

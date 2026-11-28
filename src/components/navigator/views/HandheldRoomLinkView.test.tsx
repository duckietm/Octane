import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';

const link = vi.hoisted(() => ({ copy: vi.fn(() => Promise.resolve(true)) }));

vi.mock('../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    CopyToClipboard: link.copy,
    GetConfigurationValue: (key: string, fallback: unknown) =>
        key === 'url.prefix' ? 'https://hotel.example' : key === 'thumbnails.url' ? '/t/%thumbnail%.png' : fallback,
    LocalizeText: (key: string, _keys?: string[], values?: string[]) => (key === 'navigator.embed.src' ? `\${url.prefix}/room/${values?.[0]}` : key)
}));

vi.mock('../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useNavigatorData: () => ({ navigatorData: { enteredGuestRoom: { roomId: 42, officialRoomPicRef: '' } } })
}));

const { NavigatorRoomLinkView } = await import('./NavigatorRoomLinkView');

describe('room link on a phone', () => {
    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('is a card with the link and copies it', async () => {
        const onCloseClick = vi.fn();

        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        render(<NavigatorRoomLinkView onCloseClick={onCloseClick} />);

        expect(screen.getByRole('textbox', { name: 'navigator.embed.title' })).toHaveValue('https://hotel.example/room/42');
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'generic.copy' })));
        expect(link.copy).toHaveBeenCalledWith('https://hotel.example/room/42');

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onCloseClick).toHaveBeenCalled();
    });

    it('keeps the desktop card when not on a phone', () => {
        render(<NavigatorRoomLinkView onCloseClick={vi.fn()} />);

        expect(screen.queryByTestId('handheld-room-link')).toBeNull();
        expect(screen.getByDisplayValue('https://hotel.example/room/42')).toBeInTheDocument();
    });
});

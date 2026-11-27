import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const visits = vi.hoisted(() => ({ createRoomSession: vi.fn() }));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        GetSessionDataManager: () => ({ userId: 7 }),
        RoomDataParser: { DOORBELL_STATE: 1, INVISIBLE_STATE: 3, OPEN_STATE: 0, PASSWORD_STATE: 2 }
    };
});

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        CreateRoomSession: visits.createRoomSession,
        GetConfigurationValue: (key: string, fallback?: unknown) => (key === 'thumbnails.url' ? 'https://thumbnails.test/%thumbnail%.png' : fallback),
        LocalizeText: (key: string) => key
    };
});

vi.mock('../../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks');

    return { ...actual, useDoorState: () => ({ setSnapshot: vi.fn() }) };
});

import { NavigatorSearchResultItemView } from './NavigatorSearchResultItemView';

const room = {
    description: 'A sunny terrace',
    doorMode: 0,
    habboGroupId: 0,
    maxUserCount: 25,
    officialRoomPicRef: '',
    ownerId: 7,
    ownerName: 'tester',
    roomId: 42,
    roomName: 'Terrace',
    showOwner: true,
    tags: ['sun', 'chill'],
    userCount: 4
} as any;

beforeEach(() => visits.createRoomSession.mockClear());

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('NavigatorSearchResultItemView', () => {
    it('keeps the desktop row, which enters the room on a click', () => {
        const { container } = render(<NavigatorSearchResultItemView roomData={room} />);

        expect(container.querySelector('.octane-navigator-air__row')).not.toBeNull();
        expect(container.querySelector('.octane-handheld-room')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Terrace' }));

        expect(visits.createRoomSession).toHaveBeenCalledWith(42);
    });

    it('opens the room card on a tap on a phone and enters only from its button', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        const { container } = render(<NavigatorSearchResultItemView thumbnail roomData={room} />);

        expect(container.querySelector('.octane-navigator-air__tile')).toBeNull();

        const row = screen.getByRole('button', { name: 'Terrace' });

        expect(row).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByText('tester')).toBeInTheDocument();

        fireEvent.click(row);

        expect(visits.createRoomSession).not.toHaveBeenCalled();
        expect(row).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('region', { name: 'Room details' })).toHaveTextContent('A sunny terrace');
        expect(screen.getByText('chill')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Go to room' }));

        expect(visits.createRoomSession).toHaveBeenCalledWith(42);

        fireEvent.click(row);

        expect(screen.queryByRole('region', { name: 'Room details' })).toBeNull();
    });
});

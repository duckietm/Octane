import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useNavigatorRoomInfoPopupStore } from '../../../../hooks';
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
    act(() => {
        useHandheldStore.setState({ layout: DESKTOP_LAYOUT });
        useNavigatorRoomInfoPopupStore.getState().hide();
    });
});

describe('NavigatorSearchResultItemView', () => {
    it('keeps the desktop row, which enters the room on a click', () => {
        const { container } = render(<NavigatorSearchResultItemView roomData={room} />);

        expect(container.querySelector('.octane-navigator-air__row')).not.toBeNull();
        expect(container.querySelector('.octane-handheld-room')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Terrace' }));

        expect(visits.createRoomSession).toHaveBeenCalledWith(42);
    });

    it('is a card on a phone: a tap enters the room, the i button opens its info instead', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        const { container } = render(<NavigatorSearchResultItemView thumbnail roomData={room} />);

        expect(container.querySelector('.octane-navigator-air__tile')).toBeNull();
        expect(container.querySelector('.octane-handheld-room__thumb')).not.toBeNull();
        expect(screen.getByText('tester')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'navigator.room.popup.room.info' }));

        expect(visits.createRoomSession).not.toHaveBeenCalled();
        expect(useNavigatorRoomInfoPopupStore.getState().room).toBe(room);

        fireEvent.click(screen.getByRole('button', { name: 'Terrace' }));

        expect(visits.createRoomSession).toHaveBeenCalledWith(42);
    });

    it('shows how full the room is on a phone: the level, the head count and the share of its places', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        const { container } = render(<NavigatorSearchResultItemView thumbnail roomData={{ ...room, userCount: 20, maxUserCount: 25 } as any} />);
        const meter = container.querySelector<HTMLElement>('.octane-handheld-room__meter');

        expect(meter.getAttribute('data-level')).toBe('busy');
        expect(meter.querySelector('.octane-handheld-room__meter-count').textContent).toBe('20');
        expect(meter.querySelector<HTMLElement>('.octane-handheld-room__meter-bar').style.getPropertyValue('--hh-fill')).toBe('80%');
        expect(container.querySelector('.octane-navigator-air__usercount')).toBeNull();
    });

    it('drops the picture in the compact list of a phone', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'landscape' } }));
        const { container } = render(<NavigatorSearchResultItemView roomData={room} />);

        expect(container.querySelector('.octane-handheld-room.is-compact')).not.toBeNull();
        expect(container.querySelector('.octane-handheld-room__thumb')).toBeNull();
    });
});

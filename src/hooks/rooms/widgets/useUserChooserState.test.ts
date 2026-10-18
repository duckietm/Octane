import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomObjectItem } from '../../../api/room/widgets/RoomObjectItem';

const state = vi.hoisted(() => ({
    allowed: true,
    added: null as (event: { id: number; category: number }) => void,
    removed: null as (event: { id: number; category: number }) => void,
    users: new Map<number, { roomIndex: number; type: number; name: string }>()
}));

vi.mock('@octane/renderer', () => ({
    RoomObjectCategory: { UNIT: 100 },
    GetRoomEngine: () => ({ getRoomObjects: () => [...state.users.keys()].map((id) => ({ id })) })
}));
vi.mock('../../../api', () => ({
    RoomObjectItem,
    CanOpenUserChooser: () => state.allowed,
    GetRoomSession: () => ({ roomId: 1, userDataManager: { getUserDataByIndex: (id: number) => state.users.get(id) } })
}));
vi.mock('../engine', () => ({
    useUserAddedEvent: (_enabled: boolean, callback: (event: { id: number; category: number }) => void) => { state.added = callback; },
    useUserRemovedEvent: (_enabled: boolean, callback: (event: { id: number; category: number }) => void) => { state.removed = callback; }
}));

const { useUserChooserState } = await import('./useUserChooserState');

afterEach(cleanup);

beforeEach(() =>
{
    state.allowed = true;
    state.users.clear();
});

describe('useUserChooserState (AIR UserChooserWidgetHandler)', () =>
{
    it('lists every room unit with user data, room index zero included, sorted by name', () =>
    {
        [ [ 1, 'dennis' ], [ 2, 'Rover' ], [ 3, 'Oldbot' ], [ 4, 'Robo' ] ].forEach(([ type, name ], roomIndex) =>
            state.users.set(roomIndex, { roomIndex, type: type as number, name: name as string }));

        const { result } = renderHook(useUserChooserState);

        act(() => result.current.populateChooser());

        expect(result.current.items.map((item) => [ item.id, item.name, item.type ])).toEqual([
            [ 0, 'dennis', '1' ],
            [ 2, 'Oldbot', '3' ],
            [ 3, 'Robo', '4' ],
            [ 1, 'Rover', '2' ]
        ]);
    });

    it('adds and removes pets and bots while open', () =>
    {
        const { result } = renderHook(useUserChooserState);

        act(() => result.current.populateChooser());

        state.users.set(5, { roomIndex: 5, type: 2, name: 'Rex' });
        act(() => state.added({ id: 5, category: 100 }));
        expect(result.current.items.map((item) => item.type)).toEqual([ '2' ]);

        act(() => state.removed({ id: 5, category: 100 }));
        expect(result.current.items).toEqual([]);
    });

    it('stays closed while the room disables the chooser for this visitor', () =>
    {
        state.allowed = false;
        state.users.set(0, { roomIndex: 0, type: 1, name: 'dennis' });

        const { result } = renderHook(useUserChooserState);

        act(() => result.current.populateChooser());

        expect(result.current.items).toBeNull();
    });
});

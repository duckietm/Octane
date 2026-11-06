/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers, on } = vi.hoisted(() => {
    const handlers = new Map<unknown, (event: any) => void>();
    const on = (type: unknown, handler: (event: any) => void) => {
        for (const key of Array.isArray(type) ? type : [type]) handlers.set(key, handler);
    };
    return { handlers, on };
});
const fire = (type: unknown, event: any) => act(() => handlers.get(type)?.(event));

vi.mock('../../../events', () => ({ useMessageEvent: on, useOctaneEvent: on }));
vi.mock('../../engine', () => ({
    useObjectSelectedEvent: (handler: any) => on('selected', handler),
    useObjectDeselectedEvent: (handler: any) => on('deselected', handler),
    useFurniRemovedEvent: (_active: boolean, handler: any) => on('removed', handler)
}));
vi.mock('../../useRoom', () => ({ useRoom: () => ({ roomSession: { roomId: 1 } }) }));

import { GroupFurniContextMenuInfoMessageEvent, RoomObjectCategory } from '@octane/renderer';
import { GROUP_FURNITURE, useFurnitureContextMenuWidget } from './useFurnitureContextMenuWidget';

const groupReply = (objectId: number) => ({ getParser: () => ({ objectId, userIsMember: true }) });

describe('useFurnitureContextMenuWidget group reply', () => {
    it('opens the group menu of the furni still selected', () => {
        const { result } = renderHook(() => useFurnitureContextMenuWidget());

        fire('selected', { id: 10, category: RoomObjectCategory.FLOOR });
        fire(GroupFurniContextMenuInfoMessageEvent, groupReply(10));

        expect(result.current.mode).toBe(GROUP_FURNITURE);
        expect(result.current.objectId).toBe(10);
    });

    it('ignores the reply for a furni the user has left', () => {
        const { result } = renderHook(() => useFurnitureContextMenuWidget());

        fire('selected', { id: 10, category: RoomObjectCategory.FLOOR });
        fire('selected', { id: 20, category: RoomObjectCategory.FLOOR });
        fire(GroupFurniContextMenuInfoMessageEvent, groupReply(10));

        // It used to turn furni 20's menu into furni 10's group menu.
        expect(result.current.mode).toBeNull();
        expect(result.current.objectId).toBe(-1);
    });

    it('does not reopen a menu after the selection was cleared', () => {
        const { result } = renderHook(() => useFurnitureContextMenuWidget());

        fire('selected', { id: 10, category: RoomObjectCategory.FLOOR });
        fire('deselected', {});
        fire(GroupFurniContextMenuInfoMessageEvent, groupReply(10));

        expect(result.current.mode).toBeNull();
    });

    it('closes the menu of a furni that is removed', () => {
        const { result } = renderHook(() => useFurnitureContextMenuWidget());

        fire('selected', { id: 10, category: RoomObjectCategory.FLOOR });
        fire(GroupFurniContextMenuInfoMessageEvent, groupReply(10));
        // A confirm or a menu left open acted on an object that was gone.
        fire('removed', { id: 10 });

        expect(result.current.mode).toBeNull();
        expect(result.current.objectId).toBe(-1);
    });
});

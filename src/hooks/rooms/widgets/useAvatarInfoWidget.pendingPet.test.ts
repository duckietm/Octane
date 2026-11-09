/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers, on, roomSession } = vi.hoisted(() => {
    const handlers = new Map<string, (event: any) => void>();
    const on = (type: unknown, handler: (event: any) => void) => {
        for (const key of Array.isArray(type) ? type : [type]) if (typeof key === 'string') handlers.set(key, handler);
    };
    const petData = { type: 'mock:RoomObjectType:PET', webID: 50 };
    const roomSession = { userDataManager: { getUserDataByIndex: () => petData, requestPetInfo: () => {} } };
    return { handlers, on, roomSession };
});
const fire = (type: string, event: any) => act(() => handlers.get(type)?.(event));

vi.mock('@octane/renderer', async (importOriginal) => {
    const real = await importOriginal<Record<string, unknown>>();
    // Event classes the shared mock leaves out: their constants only need to be distinct strings.
    const stub = (name: string) => new Proxy({}, { get: (_, prop) => (typeof prop === 'string' ? `${name}:${prop}` : undefined) });
    return new Proxy(real, { get: (target, prop: string) => (prop in target ? target[prop] : stub(prop)), has: () => true });
});

vi.mock('../../events', () => ({
    useMessageEvent: on,
    useOctaneEvent: on,
    useUiEvent: on
}));
vi.mock('../engine', () => ({
    useObjectSelectedEvent: (handler: any) => on('selected', handler),
    useObjectDeselectedEvent: (handler: any) => on('deselected', handler),
    useObjectRollOverEvent: () => {},
    useObjectRollOutEvent: () => {}
}));
vi.mock('../../friends', () => ({ useFriends: () => ({ friends: [] }) }));
vi.mock('../../wired', () => ({ useWired: () => ({}) }));
vi.mock('../useRoom', () => ({ useRoom: () => ({ roomSession }) }));
vi.mock('../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    AvatarInfoUtilities: { getPetInfo: (data: any) => ({ id: data.id, kind: 'pet' }) }
}));

import { RoomObjectCategory, RoomSessionPetInfoUpdateEvent } from '@octane/renderer';
import { useAvatarInfoWidget } from './useAvatarInfoWidget';

describe('useAvatarInfoWidget pet info', () => {
    it('shows the pet whose info it asked for', () => {
        const { result } = renderHook(() => useAvatarInfoWidget());

        fire('selected', { id: 3, category: RoomObjectCategory.UNIT });
        fire(RoomSessionPetInfoUpdateEvent.PET_INFO, { petInfo: { id: 50 } });

        expect(result.current.avatarInfo).toEqual({ id: 50, kind: 'pet' });
    });

    it('drops a pet reply that lands after the selection was cleared', () => {
        const { result } = renderHook(() => useAvatarInfoWidget());

        fire('selected', { id: 3, category: RoomObjectCategory.UNIT });
        fire('deselected', {});
        // The late reply used to reopen the infostand the user had just closed.
        fire(RoomSessionPetInfoUpdateEvent.PET_INFO, { petInfo: { id: 50 } });

        expect(result.current.avatarInfo).toBeNull();
    });
});

import { GetRoomEngine, IRoomSession } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IsPlayTestRestricted } from './IsPlayTestRestricted';

const withRoomEngine = (freeFurniMovements: boolean) =>
    vi.mocked(GetRoomEngine).mockReturnValue({
        activeRoomHasFreeFurniMovementsMode: freeFurniMovements
    } as unknown as ReturnType<typeof GetRoomEngine>);

const owner = (playTestMode: boolean) => ({ roomId: 1, isRoomOwner: true, controllerLevel: 0, playTestMode }) as IRoomSession;

describe('IsPlayTestRestricted (the hotel playtest building rule)', () => {
    afterEach(() => vi.mocked(GetRoomEngine).mockReset());

    it('restricts the room owner while playtest is on', () => {
        withRoomEngine(false);

        expect(IsPlayTestRestricted(owner(true))).toBe(true);
    });

    it('leaves normal play alone', () => {
        withRoomEngine(false);

        expect(IsPlayTestRestricted(owner(false))).toBe(false);
        expect(IsPlayTestRestricted(null)).toBe(false);
    });

    it('is lifted by the free furni movements mode, as on the server', () => {
        withRoomEngine(true);

        expect(IsPlayTestRestricted(owner(true))).toBe(false);
    });
});

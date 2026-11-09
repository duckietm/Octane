import { GetRoomEngine, GetSessionDataManager, IRoomSession } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanManipulateFurniture } from './CanManipulateFurniture';

const withRoomEngine = (freeFurniMovements: boolean) =>
    vi.mocked(GetRoomEngine).mockReturnValue({
        activeRoomHasFreeFurniMovementsMode: freeFurniMovements,
        getRoomObject: (): null => null
    } as unknown as ReturnType<typeof GetRoomEngine>);

const visitor = { roomId: 1, isRoomOwner: false, controllerLevel: 0 } as IRoomSession;

describe('CanManipulateFurniture (AIR checkFurniManipulationRights)', () => {
    beforeEach(() => vi.mocked(GetSessionDataManager).mockReturnValue({ hasPermission: () => false, userId: 7 } as never));

    afterEach(() => {
        vi.mocked(GetRoomEngine).mockReset();
        vi.mocked(GetSessionDataManager).mockReset();
    });

    it('refuses a visitor without rights while free furni movements are off', () => {
        withRoomEngine(false);

        expect(CanManipulateFurniture(visitor, 3, 10)).toBe(false);
    });

    it('lets a visitor move furni while the room has free furni movements on', () => {
        withRoomEngine(true);

        expect(CanManipulateFurniture(visitor, 3, 10)).toBe(true);
    });

    it('still lets rights holders through and refuses without a session', () => {
        withRoomEngine(false);

        expect(CanManipulateFurniture({ ...visitor, controllerLevel: 1 } as IRoomSession, 3, 10)).toBe(true);
        expect(CanManipulateFurniture(null, 3, 10)).toBe(false);
    });
});

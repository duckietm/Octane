/* @vitest-environment jsdom */
import { GetRoomEngine, GetRoomSessionManager } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupItem } from './GroupItem';
import { IBotItem } from './IBotItem';
import { attemptBotPlacement, attemptItemPlacement, attemptPetPlacement, cancelRoomObjectPlacement } from './InventoryUtilities';
import { IPetItem } from './IPetItem';

const processRoomObjectPlacement = vi.fn(() => true);

const setUp = (playTestMode: boolean, freeFurniMovements = false) => {
    const session = { roomId: 1, isRoomOwner: true, allowPets: true, controllerLevel: 0, playTestMode };

    vi.mocked(GetRoomSessionManager).mockReturnValue({ getSession: () => session } as never);
    vi.mocked(GetRoomEngine).mockReturnValue({
        activeRoomHasFreeFurniMovementsMode: freeFurniMovements,
        processRoomObjectPlacement,
        cancelRoomObjectPlacement: vi.fn()
    } as never);
};

const furni = () =>
    ({
        getUnlockedCount: () => 1,
        getLastItem: () => ({ id: 3, ref: 3, category: 1, isWallItem: false, type: 10, extra: 0, stuffData: {} })
    }) as unknown as GroupItem;

const pet = { petData: { id: 4, typeId: 0, level: 1, figureData: { figuredata: '0 0 ffffff' } } } as unknown as IPetItem;

const bot = { botData: { id: 5, figure: 'hd-180-1' } } as unknown as IBotItem;

describe('inventory placement in playtest (the hotel rule beyond AIR)', () => {
    afterEach(() => {
        cancelRoomObjectPlacement();
        processRoomObjectPlacement.mockClear();
        vi.mocked(GetRoomSessionManager).mockReset();
        vi.mocked(GetRoomEngine).mockReset();
    });

    it('places furni, pets and bots in normal play', () => {
        setUp(false);

        expect(attemptItemPlacement(furni())).toBe(true);
        expect(attemptPetPlacement(pet)).toBe(true);
        expect(attemptBotPlacement(bot)).toBe(true);
        expect(processRoomObjectPlacement).toHaveBeenCalledTimes(3);
    });

    it('places nothing from the inventory in playtest, the room owner included', () => {
        setUp(true);

        expect(attemptItemPlacement(furni())).toBe(false);
        expect(attemptPetPlacement(pet)).toBe(false);
        expect(attemptBotPlacement(bot)).toBe(false);
        expect(processRoomObjectPlacement).not.toHaveBeenCalled();
    });

    it('places again in playtest when the room has free furni movements', () => {
        setUp(true, true);

        expect(attemptItemPlacement(furni())).toBe(true);
        expect(processRoomObjectPlacement).toHaveBeenCalledTimes(1);
    });
});

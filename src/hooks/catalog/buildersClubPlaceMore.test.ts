import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ sent: [] as unknown[], placements: [] as unknown[][], accept: true }));

vi.mock('../../api', () => ({ SendMessageComposer: (composer: unknown) => state.sent.push(composer) }));
vi.mock('@octane/renderer', () => {
    class BuildersClubPlaceRoomItemMessageComposer {
        constructor(public pageId: number, public offerId: number, public extraParam: string, public x: number, public y: number, public direction: number) {}
    }
    class BuildersClubPlaceWallItemMessageComposer {
        constructor(public pageId: number, public offerId: number, public extraParam: string, public wallLocation: string) {}
    }

    return {
        BuildersClubPlaceRoomItemMessageComposer,
        BuildersClubPlaceWallItemMessageComposer,
        RoomObjectCategory: { FLOOR: 10, WALL: 20 },
        RoomObjectPlacementSource: { CATALOG: 'catalog' },
        GetRoomEngine: () => ({
            processRoomObjectPlacement: (...args: unknown[]) => {
                state.placements.push(args);

                return state.accept;
            }
        })
    };
});

import { canPlaceMore, finishPlaceMore, requestPlaceMore, useBuildersClubPlaceMoreStore } from './buildersClubPlaceMore';

const available = { enabled: true, buildersClubEnabled: true, bcOfferId: 12, availableForBuildersClub: true, placeable: true, playTest: false };
const spot = { placedInRoom: true, category: 10, x: 3, y: 4, direction: 2, wallLocation: '' };

beforeEach(() => {
    state.sent.length = 0;
    state.placements.length = 0;
    state.accept = true;
    useBuildersClubPlaceMoreStore.getState().setPending(null);
});

describe('infostand place more', () => {
    it('is offered only for a Builders Club furni with an offer, when everything allows it', () => {
        expect(canPlaceMore(available)).toBe(true);

        for (const off of [{ enabled: false }, { buildersClubEnabled: false }, { bcOfferId: -1 }, { availableForBuildersClub: false }, { placeable: false }, { playTest: true }]) {
            expect(canPlaceMore({ ...available, ...off })).toBe(false);
        }
    });

    it('puts the furni on the cursor under its offer and places it from the Builders Club', () => {
        expect(requestPlaceMore({ offerId: 12, classId: 345, wall: false, extraParam: 'x' })).toBe(true);
        expect(state.placements).toEqual([['catalog', -12, 10, 345, 'x']]);

        expect(finishPlaceMore(spot)).toBe(true);
        expect(state.sent).toEqual([{ pageId: -1, offerId: 12, extraParam: 'x', x: 3, y: 4, direction: 2 }]);
        expect(useBuildersClubPlaceMoreStore.getState().pending).toBeNull();
    });

    it('places a wall furni at its wall location', () => {
        requestPlaceMore({ offerId: 7, classId: 9, wall: true, extraParam: '' });
        finishPlaceMore({ ...spot, category: 20, wallLocation: ':w=1,2 l=3,4 r' });

        expect(state.sent).toEqual([{ pageId: -1, offerId: 7, extraParam: '', wallLocation: ':w=1,2 l=3,4 r' }]);
    });

    it('sends nothing when the placement is cancelled, and still takes the event', () => {
        requestPlaceMore({ offerId: 12, classId: 345, wall: false, extraParam: '' });

        expect(finishPlaceMore({ ...spot, placedInRoom: false })).toBe(true);
        expect(state.sent).toEqual([]);
    });

    it('leaves a placement that is not its own to the catalogue', () => {
        expect(finishPlaceMore(spot)).toBe(false);
    });

    it('keeps nothing pending when the room refuses the placement', () => {
        state.accept = false;

        expect(requestPlaceMore({ offerId: 12, classId: 345, wall: false, extraParam: '' })).toBe(false);
        expect(useBuildersClubPlaceMoreStore.getState().pending).toBeNull();
    });
});

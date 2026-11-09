import { describe, expect, it } from 'vitest';
import { getNavigatorLiftedImageUrl, NAVIGATOR_LIFTED_DEFAULT_IMAGE, toNavigatorLiftedRooms } from './NavigatorLiftedRooms';

describe('getNavigatorLiftedImageUrl', () => {
    it('puts the image below the image library, as AIR LiftDataContainer does', () => {
        expect(getNavigatorLiftedImageUrl({ image: 'officialrooms_hq/lobby.png' }, 'https://img/c_images/')).toBe(
            'https://img/c_images/officialrooms_hq/lobby.png'
        );
    });

    it('falls back to the default teaser for an empty image', () => {
        expect(getNavigatorLiftedImageUrl({ image: '' }, 'https://img/c_images/')).toBe(`https://img/c_images/${NAVIGATOR_LIFTED_DEFAULT_IMAGE}`);
    });
});

describe('toNavigatorLiftedRooms', () => {
    it('copies the parsed rooms into plain objects and tolerates a missing list', () => {
        expect(toNavigatorLiftedRooms([{ roomId: 4, areaId: 1, image: null, caption: 'Lobby' }])).toEqual([
            { roomId: 4, areaId: 1, image: '', caption: 'Lobby' }
        ]);
        expect(toNavigatorLiftedRooms(null)).toEqual([]);
    });
});

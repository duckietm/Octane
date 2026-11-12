import { BuildersClubPlaceRoomItemMessageComposer, BuildersClubPlaceWallItemMessageComposer, GetRoomEngine, RoomObjectCategory, RoomObjectPlacementSource } from '@octane/renderer';
import { SendMessageComposer } from '../../api';
import { createOctaneStore } from '../../state/createOctaneStore';

/**
 * The official infostand "place more" (InfoStandWidget.requestItemToMover): another copy of the selected Builders
 * Club furni goes on the cursor and is placed straight from the Builders Club, without opening its catalogue.
 *
 * The furni's Builders Club offer comes from the furnidata (`bcofferid`). A hotel whose furnidata has none never
 * shows the button.
 */
export interface PlaceMoreRequest {
    /** The Builders Club offer that sells the furni. */
    offerId: number;
    /** The furni's class id, which the cursor shows. */
    classId: number;
    wall: boolean;
    extraParam: string;
}

interface PlaceMoreState {
    pending: PlaceMoreRequest | null;
    setPending: (pending: PlaceMoreRequest | null) => void;
}

export const useBuildersClubPlaceMoreStore = createOctaneStore<PlaceMoreState>()((set) => ({
    pending: null,
    setPending: (pending) => set({ pending })
}));

export interface PlaceMoreAvailability {
    /** Client setting `infostand.place_more.enabled`. */
    enabled: boolean;
    buildersClubEnabled: boolean;
    bcOfferId: number;
    availableForBuildersClub: boolean;
    /** The player may place Builders Club furni in this room right now. */
    placeable: boolean;
    playTest: boolean;
}

/** Official InfoStandFurniView.updatePurchaseButtonVisibility: when the button is offered. */
export const canPlaceMore = ({ enabled, buildersClubEnabled, bcOfferId, availableForBuildersClub, placeable, playTest }: PlaceMoreAvailability): boolean =>
    enabled && buildersClubEnabled && !playTest && availableForBuildersClub && Number.isInteger(bcOfferId) && bcOfferId >= 0 && placeable;

/** Puts the furni on the cursor; the placement itself is finished by {@link finishPlaceMore}. */
export const requestPlaceMore = (request: PlaceMoreRequest): boolean => {
    const category = request.wall ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
    const started = GetRoomEngine().processRoomObjectPlacement(RoomObjectPlacementSource.CATALOG, -request.offerId, category, request.classId, request.extraParam);

    useBuildersClubPlaceMoreStore.getState().setPending(started ? request : null);

    return !!started;
};

export interface PlacedSpot {
    placedInRoom: boolean;
    category: number;
    x: number;
    y: number;
    direction: number;
    wallLocation: string;
}

/**
 * The cursor's furni was set down (or the placement cancelled): sends the Builders Club placement for a pending
 * "place more". Returns whether the event belonged to one, so the catalogue's own handler leaves it alone.
 */
export const finishPlaceMore = (spot: PlacedSpot): boolean => {
    const { pending, setPending } = useBuildersClubPlaceMoreStore.getState();

    if (!pending) return false;

    setPending(null);

    if (!spot.placedInRoom) return true;

    // No page: the server finds a Builders Club offer by its id alone.
    if (spot.category === RoomObjectCategory.WALL) {
        SendMessageComposer(new BuildersClubPlaceWallItemMessageComposer(-1, pending.offerId, pending.extraParam, spot.wallLocation));
    } else {
        SendMessageComposer(new BuildersClubPlaceRoomItemMessageComposer(-1, pending.offerId, pending.extraParam, spot.x, spot.y, spot.direction));
    }

    return true;
};

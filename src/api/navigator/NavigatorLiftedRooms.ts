/** A room of the navigator's lifted list (AIR LiftDataContainer, NavigatorLifted packet). */
export interface INavigatorLiftedRoom {
    roomId: number;
    areaId: number;
    image: string;
    caption: string;
}

/** AIR LiftDataContainer.DEFAULT_IMAGE, below image.library.url. */
export const NAVIGATOR_LIFTED_DEFAULT_IMAGE = 'officialrooms_hq/nav_teaser_wl.png';

/** AIR LiftDataContainer.getUrlForLiftImageAtIndex: the room's image below the image library, or the default teaser. */
export const getNavigatorLiftedImageUrl = (room: Pick<INavigatorLiftedRoom, 'image'>, imageLibraryUrl: string): string =>
    (imageLibraryUrl ?? '') + (room?.image ? room.image : NAVIGATOR_LIFTED_DEFAULT_IMAGE);

/** The hotel view tab, the one AIR opens first and the only one the lifted rooms are shown on. */
export const NAVIGATOR_LIFTED_VIEW_CODE = 'official_view';

export const toNavigatorLiftedRooms = (
    rooms: ReadonlyArray<{ roomId: number; areaId: number; image: string; caption: string }> | null | undefined
): INavigatorLiftedRoom[] => (rooms ?? []).map((room) => ({ roomId: room.roomId, areaId: room.areaId, image: room.image ?? '', caption: room.caption ?? '' }));

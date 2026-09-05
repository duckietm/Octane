import { AddFavouriteRoomMessageComposer, DeleteFavouriteRoomMessageComposer } from '@octane/renderer';
import { SendMessageComposer } from '..';

export const ToggleFavoriteRoom = (roomId: number, isFavorite: boolean): void => {
    if (roomId <= 0) return;

    SendMessageComposer(isFavorite ? new DeleteFavouriteRoomMessageComposer(roomId) : new AddFavouriteRoomMessageComposer(roomId));
};

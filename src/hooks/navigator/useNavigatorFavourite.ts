import { useCallback } from 'react';
import { localizeWithFallback, ToggleFavoriteRoom } from '../../api';
import { useNotification } from '../notification';
import { useNavigatorFavouritesStore } from './navigatorFavouritesStore';

export const useNavigatorFavourite = (roomId: number) => {
    const isFavourite = useNavigatorFavouritesStore((s) => s.ids.has(Number(roomId)));
    const { simpleAlert = null } = useNotification();

    const toggle = useCallback(() => {
        const { ids, limit } = useNavigatorFavouritesStore.getState();

        // The server ignores an add past its limit, so the star would just not light up.
        if (!isFavourite && limit > 0 && ids.size >= limit) {
            simpleAlert(
                localizeWithFallback('navigator.favouritesfull.body', `You can have at most ${limit} favourite rooms. Remove one first.`, ['limit'], [String(limit)]),
                null,
                null,
                null,
                localizeWithFallback('navigator.favouritesfull.title', 'Favourites full')
            );
            return;
        }

        ToggleFavoriteRoom(Number(roomId), isFavourite);
    }, [roomId, isFavourite, simpleAlert]);

    return { isFavourite, toggle };
};

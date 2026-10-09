import { createOctaneStore } from '../../state/createOctaneStore';

export type NavigatorFavouritesState = {
    ids: Set<number>;
    /** Most favourites the server allows; 0 until it says. */
    limit: number;
};

export type NavigatorFavouritesActions = {
    setAll(roomIds: number[], limit?: number): void;
    apply(roomId: number, added: boolean): void;
};

export const useNavigatorFavouritesStore = createOctaneStore<NavigatorFavouritesState & NavigatorFavouritesActions>()((set) => ({
    ids: new Set<number>(),
    limit: 0,

    setAll: (roomIds, limit) => set((s) => ({ ids: new Set(roomIds.map(Number)), limit: limit ?? s.limit })),
    apply: (roomId, added) =>
        set((s) => {
            const id = Number(roomId);
            if (added ? s.ids.has(id) : !s.ids.has(id)) return s;
            const ids = new Set(s.ids);
            if (added) ids.add(id);
            else ids.delete(id);
            return { ids };
        })
}));

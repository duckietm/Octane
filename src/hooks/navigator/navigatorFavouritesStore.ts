import { createOctaneStore } from '../../state/createOctaneStore';

export type NavigatorFavouritesState = {
    ids: Set<number>;
};

export type NavigatorFavouritesActions = {
    setAll(roomIds: number[]): void;
    apply(roomId: number, added: boolean): void;
};

export const useNavigatorFavouritesStore = createOctaneStore<NavigatorFavouritesState & NavigatorFavouritesActions>()((set) => ({
    ids: new Set<number>(),

    setAll: (roomIds) => set({ ids: new Set(roomIds.map(Number)) }),
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

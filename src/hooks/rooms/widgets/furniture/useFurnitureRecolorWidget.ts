import { createOctaneStore } from '../../../../state/createOctaneStore';

interface FurnitureRecolorStore
{
    objectId: number;
    open: (objectId: number) => void;
    close: () => void;
}

const useFurnitureRecolorStore = createOctaneStore<FurnitureRecolorStore>()((set) => ({
    objectId: -1,
    open: (objectId) => set({ objectId }),
    close: () => set({ objectId: -1 })
}));

export const useFurnitureRecolorWidget = () =>
{
    const objectId = useFurnitureRecolorStore((state) => state.objectId);
    const open = useFurnitureRecolorStore((state) => state.open);
    const close = useFurnitureRecolorStore((state) => state.close);

    return { objectId, open, close };
};

import { MapDataType } from '@octane/renderer';
import { isRecolorableClass, NO_RECOLOR, recolorablePalette, recolorChannels } from '../../api';
import { createOctaneStore } from '../../state/createOctaneStore';

interface RecolorableColorState
{
    /** The colour last chosen per recolourable classname (lowercase), packed 0xRRGGBB. */
    colors: Record<string, number>;
    setColor: (className: string, rgb: number) => void;
}

/**
 * The colour picked for each recolourable furni, kept for the session as in the official client: the
 * catalog page opens on it again, and "buy one more" from the infostand carries the furni's colour over.
 */
export const useRecolorableColorStore = createOctaneStore<RecolorableColorState>()((set) => ({
    colors: {},
    setColor: (className, rgb) =>
    {
        if (!className || rgb < 0) return;

        set((state) => ({ colors: { ...state.colors, [className.toLowerCase()]: rgb & 0xffffff } }));
    }
}));

/** The colour to use for a furni: the one chosen before when its palette has it, else the palette's first. */
export const pickRecolorableColor = (colors: Record<string, number>, className: string, palette: number[]): number =>
{
    const chosen = className ? colors[className.toLowerCase()] : undefined;

    if ((chosen !== undefined) && palette.includes(chosen)) return chosen;

    return palette.length ? palette[0] : -1;
};

/** The colour a recolourable furni is placed in from the catalog; NO_RECOLOR for any other furni. */
export const recolorablePlacementColor = (className: string): number =>
{
    if (!isRecolorableClass(className)) return NO_RECOLOR;

    return pickRecolorableColor(useRecolorableColorStore.getState().colors, className, recolorablePalette(className));
};

/** A furni data map with the colour, as the room sends it for a recolourable furni. */
export const recolorableObjectData = (rgb: number, state = '0'): MapDataType =>
{
    if (rgb < 0) return null;

    const [red, green, blue] = recolorChannels(rgb);
    const data = new MapDataType();

    data.setValue('state', state);
    data.setValue('r', String(red));
    data.setValue('g', String(green));
    data.setValue('b', String(blue));

    return data;
};

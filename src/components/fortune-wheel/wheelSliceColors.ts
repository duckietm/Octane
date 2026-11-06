/** Slice colours of the wheel, Habbo's bright palette; a theme can override them with --wheel-slice-<n>. */
export const WHEEL_SLICE_COLORS = ['#f7c331', '#2b95d6', '#e8473b', '#71c043', '#a75fd0', '#f58a2b'];

/** The colour index of each slice, so no two neighbours share a colour, the last and first slices included. */
export const getSliceColorIndexes = (count: number, paletteSize = WHEEL_SLICE_COLORS.length): number[] => {
    const indexes = Array.from({ length: Math.max(0, count) }, (_, i) => i % paletteSize);

    if (count > 2 && paletteSize > 2 && indexes[count - 1] === indexes[0]) {
        let next = (indexes[count - 2] + 1) % paletteSize;

        if (next === indexes[0]) next = (next + 1) % paletteSize;

        indexes[count - 1] = next;
    }

    return indexes;
};

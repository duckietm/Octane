/**
 * How many tabs of a fixed width fit a strip (the messenger's friend heads): on a phone the strip is as wide as the screen, so it
 * shows as many as fit there instead of the desktop window's fixed count. Never fewer than one; at most `maximum`.
 */
export const fittingTabCount = (stripWidth: number, tabWidth: number, maximum: number): number => {
    if (!(stripWidth > 0) || !(tabWidth > 0)) return Math.max(1, maximum);

    return Math.max(1, Math.min(Math.max(1, maximum), Math.floor(stripWidth / tabWidth)));
};

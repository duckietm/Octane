/** Pure rules of AIR's nux/NuxGiftSelectionView. */

export interface INuxGiftProduct {
    /** The product (furni class) code. */
    itemName: string;
    /** A localization key that names the product; wins over the product name. */
    extraInfo: string | null;
}

export interface INuxGiftOption {
    thumbnailUrl: string | null;
    products: INuxGiftProduct[];
}

export interface INuxGiftStep {
    dayIndex: number;
    stepIndex: number;
    options: INuxGiftOption[];
}

export interface INuxGiftSelection {
    dayIndex: number;
    stepIndex: number;
    giftIndex: number;
}

/** `nux.gift.selection.separator` is URI-encoded (" + "); a broken value falls back to ", ". */
export const decodeNuxGiftSeparator = (value: string): string => {
    if (!value) return ', ';

    try {
        return decodeURI(value);
    } catch {
        return value;
    }
};

/** getProductName per product of an option, joined by the separator. */
export const getNuxGiftOptionName = (option: INuxGiftOption, nameOf: (product: INuxGiftProduct) => string, separator: string): string =>
    option.products.map(nameOf).join(separator);

/** The thumbnail lives in the image library (`image.library.url` + its path). */
export const getNuxGiftThumbnailUrl = (library: string, option: INuxGiftOption): string | null => (option.thumbnailUrl ? `${library}${option.thumbnailUrl}` : null);

/** The frame caption numbers the steps when there is more than one. */
export const getNuxGiftCaption = (title: string, stepIndex: number, stepCount: number): string => (stepCount > 1 ? `${title} ${stepIndex + 1}/${stepCount}` : title);

/**
 * onSelectOption: the choice of a step is kept and the next step shown; after the last step the
 * caller sends all the choices (NewUserExperienceGetGifts).
 */
export const selectNuxGift = (
    steps: INuxGiftStep[],
    current: number,
    selections: INuxGiftSelection[],
    giftIndex: number
): { current: number; selections: INuxGiftSelection[]; done: boolean } => {
    const step = steps[current];

    if (!step) return { current, selections, done: false };

    const next = [...selections, { dayIndex: step.dayIndex, stepIndex: step.stepIndex, giftIndex }];

    return { current: current + 1, selections: next, done: current + 1 >= steps.length };
};

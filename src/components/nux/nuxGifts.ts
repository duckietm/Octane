/**
 * Pure logic of the official NUX dialogs (HabboNuxDialogs, NuxGiftSelectionView).
 *
 * The gift offer packet carries one step per (day, step) with a few options;
 * the view shows one step at a time, remembers the chosen option index and
 * sends every choice at once after the last step.
 */

/** Official NewUserExperienceScriptProceed values: 0 = verify / go on, 2 = never again. */
export const NUX_PROCEED_VERIFY = 0;
export const NUX_PROCEED_NEVER_AGAIN = 2;

export interface NuxGiftOfferLike {
    itemName: string;
    extraInfo: string | null;
}

export interface NuxGiftLike {
    thumbnailUrl: string | null;
    productOfferList: NuxGiftOfferLike[];
}

export interface NuxGiftStepLike {
    dayIndex: number;
    stepIndex: number;
    options: NuxGiftLike[];
}

export interface NuxGiftSelection {
    dayIndex: number;
    stepIndex: number;
    giftIndex: number;
}

export type TextLookup = (key: string) => string;

const localized = (lookup: TextLookup, key: string): string => {
    const value = lookup(key);

    return value && value !== key ? value : '';
};

/**
 * NuxGiftSelectionView.populateStep: an option is named after its products, each
 * through its localization key when the server sends one, otherwise the
 * `product_<code>_name` text, otherwise the product code itself.
 */
export const resolveNuxGiftOptionName = (gift: NuxGiftLike, lookup: TextLookup, separator: string): string =>
    gift.productOfferList
        .map((offer) => {
            if (offer.extraInfo) return localized(lookup, offer.extraInfo) || offer.extraInfo;

            return localized(lookup, `product_${offer.itemName}_name`) || offer.itemName;
        })
        .join(separator);

/** `nux.gift.selection.separator` is URI encoded in the texts ("%20+%20"). */
export const resolveNuxGiftSeparator = (lookup: TextLookup): string => {
    const raw = localized(lookup, 'nux.gift.selection.separator');

    if (!raw) return ', ';

    try {
        return decodeURI(raw);
    } catch {
        return raw;
    }
};

/** "Choose gift option 2/3" while there is more than one step, the plain title otherwise. */
export const resolveNuxGiftTitle = (title: string, stepIndex: number, stepCount: number): string =>
    stepCount > 1 ? `${title} ${stepIndex + 1}/${stepCount}` : title;

/**
 * NuxGiftSelectionView.onSelectOption: record the choice, move on, and report
 * whether every step is now answered (the selections are then sent together).
 */
export const selectNuxGiftOption = (
    steps: readonly NuxGiftStepLike[],
    selections: readonly NuxGiftSelection[],
    currentStep: number,
    giftIndex: number
): { selections: NuxGiftSelection[]; nextStep: number; complete: boolean } => {
    const step = steps[currentStep];

    if (!step || giftIndex < 0 || giftIndex >= step.options.length) return { selections: [...selections], nextStep: currentStep, complete: false };

    const next = [...selections, { dayIndex: step.dayIndex, stepIndex: step.stepIndex, giftIndex }];
    const nextStep = currentStep + 1;

    return { selections: next, nextStep, complete: nextStep >= steps.length };
};

/** HabboNuxDialogs.onRoomSessionEvent: the lobby offer only fires for real newbies in their home room. */
export const shouldOfferNoobLobby = (gate: { lobbiesEnabled: boolean; isRealNoob: boolean; roomId: number; homeRoomId: number }): boolean =>
    gate.lobbiesEnabled && gate.isRealNoob && gate.roomId > 0 && gate.roomId === gate.homeRoomId;

import { IFigurePartSet } from '@octane/renderer';

export const IsNftAvatarPartSet = (
    partSet: IFigurePartSet,
    knownNftFigureSetIds: ReadonlySet<number>,
    detectFromAssets: (partSet: IFigurePartSet) => boolean
): boolean => {
    if (!partSet) return false;

    // The server-sent furniture-name map is authoritative when present.
    if (knownNftFigureSetIds.size > 0) return knownNftFigureSetIds.has(partSet.id);

    // Asset detection only classifies a set as NFT when its parts are served
    // exclusively by NFT libraries, so shared base sets (hd:1/2, bd:1, lh:1,
    // rh:1, and similar) that NFT libraries re-declare stay in Generic.
    // isSellable is deliberately NOT required here: custom figuredata often
    // ships NFT clothing without sellable="1", and gating on it empties the
    // NFT tab while leaking the NFT sets into the default categories.
    return detectFromAssets(partSet);
};

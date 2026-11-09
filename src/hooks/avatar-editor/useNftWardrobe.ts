import {
    AvatarEditorFigureCategory,
    GetSelectedNftWardrobeOutfitComposer,
    GetUserNftWardrobeComposer,
    SaveUserNftWardrobeComposer,
    SelectedNftWardrobeOutfitEvent,
    UserNftWardrobeEvent
} from '@octane/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AVATAR_EDITOR_EFFECTS_TAB, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import {
    findNftOutfitByToken,
    NftOutfit,
    NftWornOutfit,
    normalizeNftGender,
    resolveNftTabSwitch,
    toNftOutfits
} from './nftWardrobe.helpers';
import { useAvatarEditor } from './useAvatarEditor';

interface LookSnapshot {
    figure: string;
    gender: string;
}

/**
 * AIR avatar collectibles in the avatar editor (avatar/nft/NftAvatarsModel and the NFT parts of
 * HabboAvatarEditor). While `enabled` (editor open, `collectibles.enabled`, no clothing booth) it asks the
 * user's collectible looks (3206 -> 2236) and the worn one (3810 -> 350). Picking a look previews it; saving
 * with one picked wears it (133, then 3810 again) instead of saving a figure. While one is worn, the NFT tab
 * shows it and the clothing tabs the look it replaced.
 */
export const useNftWardrobe = (enabled: boolean, activeModelKey: string) => {
    const { loadOutfitFigure = null, getFigureString = '', gender = 'M' } = useAvatarEditor();
    const [outfits, setOutfits] = useState<NftOutfit[]>([]);
    const [worn, setWorn] = useState<NftWornOutfit>(null);
    const [pendingOutfit, setPendingOutfit] = useState<NftOutfit>(null);
    const previousLookRef = useRef<LookSnapshot>(null);
    const activeModelKeyRef = useRef(activeModelKey);
    const enabledRef = useRef(enabled);

    useEffect(() => {
        activeModelKeyRef.current = activeModelKey;
        enabledRef.current = enabled;
    }, [activeModelKey, enabled]);

    useMessageEvent<UserNftWardrobeEvent>(UserNftWardrobeEvent, (event) => setOutfits(toNftOutfits(event.getParser().nftAvatars)));

    useMessageEvent<SelectedNftWardrobeOutfitEvent>(SelectedNftWardrobeOutfitEvent, (event) => {
        const parser = event.getParser();
        const next: NftWornOutfit = {
            tokenId: parser.tokenId,
            fallbackFigure: parser.fallbackFigure,
            fallbackGender: normalizeNftGender(parser.fallbackGender)
        };

        setWorn(next);

        // AIR onUserNftWardrobeMessage: away from the NFT tab the editor edits the look from before the collectible.
        if (!enabledRef.current || activeModelKeyRef.current === AvatarEditorFigureCategory.NFT || !next.fallbackFigure) return;

        loadOutfitFigure?.(next.fallbackFigure, next.fallbackGender);
    });

    useEffect(() => {
        setPendingOutfit(null);
        previousLookRef.current = null;

        if (!enabled) return;

        setWorn(null);
        SendMessageComposer(new GetSelectedNftWardrobeOutfitComposer());
        SendMessageComposer(new GetUserNftWardrobeComposer());
    }, [enabled]);

    const wornOutfit = useMemo(() => findNftOutfitByToken(outfits, worn?.tokenId), [outfits, worn]);

    const selectOutfit = useCallback(
        (outfit: NftOutfit) => {
            if (!enabled || !outfit?.figure) return;

            if (!pendingOutfit) previousLookRef.current = { figure: getFigureString, gender };

            setPendingOutfit(outfit);
            loadOutfitFigure?.(outfit.figure, outfit.gender);
        },
        [enabled, gender, getFigureString, loadOutfitFigure, pendingOutfit]
    );

    /** AIR AvatarEditorView.windowEventProc: call before switching the main tab. */
    const onTabChange = useCallback(
        (nextModelKey: string) => {
            if (!enabled || nextModelKey === activeModelKey) return;

            const action = resolveNftTabSwitch({
                toNft: nextModelKey === AvatarEditorFigureCategory.NFT,
                toEffects: nextModelKey === AVATAR_EDITOR_EFFECTS_TAB,
                toHotLooks: nextModelKey === AvatarEditorFigureCategory.HOTLOOKS,
                hasWorn: !!worn,
                hasPending: !!pendingOutfit
            });

            switch (action) {
                case 'loadWorn': {
                    const outfit = pendingOutfit ?? wornOutfit;

                    if (outfit) loadOutfitFigure?.(outfit.figure, outfit.gender);
                    return;
                }
                case 'loadFallback':
                    setPendingOutfit(null);
                    previousLookRef.current = null;

                    if (worn?.fallbackFigure) loadOutfitFigure?.(worn.fallbackFigure, worn.fallbackGender);
                    return;
                case 'restorePrevious': {
                    const previous = previousLookRef.current;

                    setPendingOutfit(null);
                    previousLookRef.current = null;

                    if (previous) loadOutfitFigure?.(previous.figure, previous.gender);
                    return;
                }
            }
        },
        [activeModelKey, enabled, loadOutfitFigure, pendingOutfit, worn, wornOutfit]
    );

    /**
     * AIR HabboAvatarEditor.saveCurrentSelection: with a collectible picked, wears it and asks the worn one again;
     * true when it did, and the caller must not save the figure. A normal save takes the collectible off.
     */
    const save = useCallback((): boolean => {
        if (!enabled) return false;

        if (pendingOutfit) {
            SendMessageComposer(new SaveUserNftWardrobeComposer(pendingOutfit.id));
            SendMessageComposer(new GetSelectedNftWardrobeOutfitComposer());
            setPendingOutfit(null);
            previousLookRef.current = null;

            return true;
        }

        setWorn(null);

        return false;
    }, [enabled, pendingOutfit]);

    // The NftWardrobeParamView label: the picked look, else the worn one while the NFT tab is open.
    const selectedOutfit = pendingOutfit ?? (activeModelKey === AvatarEditorFigureCategory.NFT ? wornOutfit : null);

    return { enabled, outfits, wornOutfit, pendingOutfit, selectedOutfit, selectOutfit, onTabChange, save };
};

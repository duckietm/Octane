import { GetHotLooksComposer, HotLooksEvent, IHotLookInfo } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** AIR HotLooksModel.MAXIMUM_HOT_LOOKS: the editor asks for, and shows, up to 20 looks. */
export const MAXIMUM_HOT_LOOKS = 20;

export interface HotLook {
    figure: string;
    gender: string;
}

export type HotLooksByGender = Readonly<Record<'M' | 'F', readonly HotLook[]>>;

export const EMPTY_HOT_LOOKS: HotLooksByGender = Object.freeze({ M: Object.freeze([]), F: Object.freeze([]) });

/** AIR Outfit gender mapping: "m"/"M" is male, "f"/"F" female; anything else is dropped. */
const normalizeHotLookGender = (gender: string): 'M' | 'F' | null => {
    switch ((gender ?? '').trim().toUpperCase()) {
        case 'M':
            return 'M';
        case 'F':
            return 'F';
        default:
            return null;
    }
};

/**
 * AIR HotLooksModel.onHotLooks: every push replaces both lists; each look is filed under its
 * gender and the editor shows the list of the gender currently picked.
 */
export const groupHotLooksByGender = (looks: readonly IHotLookInfo[]): HotLooksByGender => {
    const grouped: Record<'M' | 'F', HotLook[]> = { M: [], F: [] };

    for (const look of looks ?? []) {
        const gender = normalizeHotLookGender(look?.gender);
        const figure = look?.figureString ?? '';

        if (!gender || !figure.length || grouped[gender].length >= MAXIMUM_HOT_LOOKS) continue;

        grouped[gender].push({ figure, gender });
    }

    return grouped;
};

/**
 * Hot looks of the avatar editor (AIR avatar/hotlooks). The official client asks for them
 * each time the editor opens; the server answers with the looks of both genders.
 */
export const useHotLooks = (enabled: boolean): HotLooksByGender => {
    const [hotLooks, setHotLooks] = useState<HotLooksByGender>(EMPTY_HOT_LOOKS);

    useMessageEvent<HotLooksEvent>(HotLooksEvent, (event) => setHotLooks(groupHotLooksByGender(event.getParser().hotLooks)));

    useEffect(() => {
        if (!enabled) return;

        SendMessageComposer(new GetHotLooksComposer(MAXIMUM_HOT_LOOKS));
    }, [enabled]);

    return hotLooks;
};

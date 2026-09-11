import { TalentLevelUpEvent, TalentTrackComposer, TalentTrackLevel, TalentTrackLevelMessageEvent, TalentTrackMessageEvent } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    isCitizenshipEnabled,
    isTalentTrackEnabled,
    normalizeTalentPerkIds,
    normalizeTalentTrackName,
    SendMessageComposer,
    shouldShowTalentLevelUp,
    TalentLevelUpRewards
} from '../../api';
import { useMessageEvent } from '../events';

export interface TalentTrackState {
    name: string;
    levels: TalentTrackLevel[];
}

export interface TalentLevelUpState extends TalentLevelUpRewards {
    name: string;
    level: number;
}

export interface TalentPromoState {
    name: string;
    level: number;
    maxLevel: number;
}

/**
 * HabboTalent.as: the talent track panorama (TalentTrackController), the level-up popup
 * (TalentLevelUpController) and the promoted track level (TalentPromoCtrl).
 */
const useTalentTrackState = () => {
    const [track, setTrack] = useState<TalentTrackState>(null);
    const [levelUp, setLevelUp] = useState<TalentLevelUpState>(null);
    const [promo, setPromo] = useState<TalentPromoState>(null);

    /** `talent/open/<track>`, the me-menu entry, the promos and the level-up button all ask the server for the track. */
    const requestTalentTrack = useCallback((name: string) => {
        if (!isTalentTrackEnabled()) return;

        SendMessageComposer(new TalentTrackComposer(normalizeTalentTrackName(name)));
    }, []);

    const closeTalentTrack = useCallback(() => setTrack(null), []);

    const closeLevelUp = useCallback(() => setLevelUp(null), []);

    useMessageEvent<TalentTrackMessageEvent>(TalentTrackMessageEvent, (event) => {
        const parser = event.getParser();

        setTrack({ name: normalizeTalentTrackName(parser.type), levels: parser.levels ?? [] });
    });

    useMessageEvent<TalentLevelUpEvent>(TalentLevelUpEvent, (event) => {
        const parser = event.getParser();
        const name = normalizeTalentTrackName(parser.talentTrackName);

        setPromo((current) => (current && current.name === name ? { ...current, level: parser.level } : current));

        if (!shouldShowTalentLevelUp(name, parser.level, isCitizenshipEnabled())) return;

        setLevelUp({
            name,
            level: parser.level,
            perks: normalizeTalentPerkIds(parser.rewardPerks ?? []),
            products: (parser.rewardProducts ?? []).map((product) => ({ productCode: product.productCode, vipDays: product.vipDays }))
        });
    });

    useMessageEvent<TalentTrackLevelMessageEvent>(TalentTrackLevelMessageEvent, (event) => {
        const parser = event.getParser();

        setPromo({ name: normalizeTalentTrackName(parser.talentTrackName), level: parser.level, maxLevel: parser.maxLevel });
    });

    return { track, levelUp, promo, requestTalentTrack, closeTalentTrack, closeLevelUp };
};

export const useTalentTrack = () => useSharedHook(useTalentTrackState);

registerSharedHook(useTalentTrackState);

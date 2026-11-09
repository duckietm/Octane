import {
    AddLinkEventTracker,
    CreateLinkEvent,
    GetTalentTrackLevelMessageComposer,
    GroupInformationComposer,
    GroupInformationEvent,
    ILinkEventTracker,
    PerkAllowancesMessageEvent,
    PerkEnum,
    RemoveLinkEventTracker,
    RoomSessionEvent,
    TalentLevelUpEvent,
    TalentTrackComposer,
    TalentTrackLevelMessageEvent,
    TalentTrackMessageEvent
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import {
    GetConfigurationValue,
    GetOptionalConfigurationValue,
    getCurrentTalentTrack,
    getTalentTaskAction,
    ITalentLevel,
    ITalentReward,
    ITalentTask,
    ITalentTrack,
    prepareTalentTrack,
    SendMessageComposer,
    shouldShowTalentLevelUp,
    TALENT_TASK_GUIDE_ADVERTISEMENT,
    TALENT_TRACKS,
    TryVisitRoom
} from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';

export interface ITalentLevelUp {
    track: string;
    level: number;
    perks: string[];
    products: ITalentReward[];
}

/** CitizenshipPopupController: the welcome popup waits ten seconds after the first room entry. */
const CITIZENSHIP_POPUP_DELAY_MS = 10_000;

const isTalentTrackEnabled = () => GetConfigurationValue<boolean>('talent.track.enabled', true);
const isCitizenshipEnabled = () => GetConfigurationValue<boolean>('talent.track.citizenship.enabled', true);

/**
 * AIR friendbar/talent/HabboTalent and its controllers: the talent track window and its task
 * dialogs, the level-up popup, the citizenship welcome popup and the toolbar promo. Opened by
 * `talent/open/<citizenship|helper|current>`.
 */
export const useTalentTrack = () => {
    const [track, setTrack] = useState<ITalentTrack>(null);
    const [selectedTask, setSelectedTask] = useState<ITalentTask>(null);
    const [levelUp, setLevelUp] = useState<ITalentLevelUp>(null);
    const [citizenshipPopup, setCitizenshipPopup] = useState(false);
    const [promoLevels, setPromoLevels] = useState<{ level: number; maxLevel: number }>(null);
    const [isCitizen, setIsCitizen] = useState(false);
    const isCitizenRef = useRef(false);
    const citizenshipShownRef = useRef(false);
    const pendingGuideGroupRef = useRef(-1);
    const citizenshipTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const promotedTrack = GetConfigurationValue<string>('talentpromo.track', '');

    isCitizenRef.current = isCitizen;

    const openTrack = (name: string) => {
        if (!isTalentTrackEnabled() || !name) return;

        const resolved = name === 'current' ? getCurrentTalentTrack(isCitizenshipEnabled(), isCitizenRef.current) : name;

        if (!TALENT_TRACKS.includes(resolved)) return;

        SendMessageComposer(new TalentTrackComposer(resolved));
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts[1] === 'open' && parts.length > 2) openTrack(parts[2]);
            },
            eventUrlPrefix: 'talent/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(
        () => () => {
            if (citizenshipTimerRef.current !== null) clearTimeout(citizenshipTimerRef.current);
            citizenshipTimerRef.current = null;
        },
        []
    );

    // TalentPromoCtrl: the level pair of the promoted track decides whether its promo shows.
    useEffect(() => {
        if (promotedTrack && isTalentTrackEnabled()) SendMessageComposer(new GetTalentTrackLevelMessageComposer(promotedTrack));
    }, [promotedTrack]);

    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, (event) => setIsCitizen(event.getParser().isAllowed(PerkEnum.CITIZEN)));

    useMessageEvent<TalentTrackMessageEvent>(TalentTrackMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const levels: ITalentLevel[] = (parser.levels ?? []).map((level) => ({
            level: level.level,
            state: level.state,
            tasks: level.tasks.map((task) => ({
                id: task.id,
                requiredLevel: task.requiredLevel,
                badgeCode: task.badgeCode,
                state: task.state,
                currentScore: task.currentScore,
                totalScore: task.totalScore
            })),
            perks: [...(level.perks ?? [])],
            products: (level.items ?? []).map((item) => ({ productCode: item.productCode, vipDays: item.vipDays }))
        }));

        setSelectedTask(null);
        setTrack(prepareTalentTrack({ name: parser.type, levels }, isCitizenshipEnabled()));
    });

    useMessageEvent<TalentLevelUpEvent>(TalentLevelUpEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (parser.talentTrackName === promotedTrack) setPromoLevels((current) => (current ? { ...current, level: parser.level } : current));

        if (!shouldShowTalentLevelUp(parser.talentTrackName, parser.level, isCitizenshipEnabled())) return;

        setLevelUp({
            track: parser.talentTrackName,
            level: parser.level,
            perks: (parser.rewardPerks ?? []).map((perk) => perk.perkId),
            products: (parser.rewardProducts ?? []).map((item) => ({ productCode: item.productCode, vipDays: item.vipDays }))
        });
    });

    useMessageEvent<TalentTrackLevelMessageEvent>(TalentTrackLevelMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !promotedTrack || parser.talentTrackName !== promotedTrack) return;

        setPromoLevels({ level: parser.level, maxLevel: parser.maxLevel });
    });

    // onGroupDetails: the helpers group of the "join the helpers" task is visited through its room.
    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if (!parser || pendingGuideGroupRef.current < 0 || parser.id !== pendingGuideGroupRef.current) return;

        pendingGuideGroupRef.current = -1;

        if (parser.roomId > 0) TryVisitRoom(parser.roomId);
    });

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.CREATED, () => {
        if (citizenshipShownRef.current || !isTalentTrackEnabled() || !isCitizenshipEnabled()) return;
        // The session sets new.identity only for a new user, so it is absent for everyone else.
        if (GetOptionalConfigurationValue<number>('new.identity', 0) <= 0 || !GetConfigurationValue<boolean>('new.user.citizenship.popup.enabled', false)) return;

        citizenshipShownRef.current = true;
        citizenshipTimerRef.current = setTimeout(() => {
            citizenshipTimerRef.current = null;
            setCitizenshipPopup(true);
        }, CITIZENSHIP_POPUP_DELAY_MS);
    });

    const closeTrack = () => {
        setSelectedTask(null);
        setTrack(null);
    };

    /** _r611e65c31ccbc6: the action button of a task's dialog. */
    const runTaskAction = (task: ITalentTask) => {
        closeTrack();

        switch (getTalentTaskAction(task.badgeCode)) {
            case 'habboway':
                CreateLinkEvent('help/habboway');
                return;
            case 'safety':
                CreateLinkEvent('help/safetybooklet');
                return;
            case 'guidegroup': {
                const groupId = GetConfigurationValue<number>('guide.help.alpha.groupid', 0);

                if (groupId > 0) {
                    pendingGuideGroupRef.current = groupId;
                    SendMessageComposer(new GroupInformationComposer(groupId, false));
                }
                return;
            }
            case 'navigator':
                CreateLinkEvent('navigator/show');
                return;
            case 'clothes':
                CreateLinkEvent('avatar-editor/show');
                return;
        }
    };

    /** onTakeTour: the guide advertisement task asks a guide for a tour. */
    const takeTour = () => {
        closeTrack();
        CreateLinkEvent('help/tour');
    };

    return {
        track,
        closeTrack,
        selectedTask,
        selectTask: setSelectedTask,
        isTourTask: (task: ITalentTask) => task?.badgeCode === TALENT_TASK_GUIDE_ADVERTISEMENT,
        runTaskAction,
        takeTour,
        levelUp,
        closeLevelUp: () => setLevelUp(null),
        citizenshipPopup,
        closeCitizenshipPopup: () => setCitizenshipPopup(false),
        promotedTrack,
        promoLevels,
        openTrack
    };
};

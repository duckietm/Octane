import {
    AddLinkEventTracker,
    CatalogPageMessageOfferData,
    CatalogPublishedMessageEvent,
    CreateLinkEvent,
    GetSeasonalCalendarDailyOfferComposer,
    GetSeasonalQuestsOnlyMessageComposer,
    ILinkEventTracker,
    QuestCompletedMessageEvent,
    QuestMessageData,
    RemoveLinkEventTracker,
    SeasonalCalendarDailyOfferMessageEvent,
    SeasonalQuestsMessageEvent
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    GetConfigurationValue,
    hasSeasonalDateChanged,
    isSeasonalQuest,
    LocalizeText,
    pickSeasonalQuestRoomId,
    SEASONAL_DAILY_REFRESH_MS,
    SEASONAL_DEFAULT_MAXIMUM_ENTITIES,
    SendMessageComposer
} from '../../api';
import { useMessageEvent } from '../events';
import { useFirstLoginOfDay } from '../session';

export interface SeasonalCalendarOffer {
    pageId: number;
    offer: CatalogPageMessageOfferData;
}

const readBoolean = (value: unknown): boolean => value === true || value === 'true' || value === 1 || value === '1';

/** HabboQuestEngine.isSeasonalCalendarEnabled / getSeasonalCampaignCodePrefix. */
export const getSeasonalCalendarSettings = () => ({
    enabled: readBoolean(GetConfigurationValue<unknown>('seasonalQuestCalendar.enabled', false)),
    prefix: String(GetConfigurationValue<string>('seasonalQuestCalendar.campaignPrefix', '') ?? ''),
    currency: Number(GetConfigurationValue<string>('seasonalQuestCalendar.currency', '0')) || 0,
    maximumEntities: Number(GetConfigurationValue<number>('seasonalQuestCalendar.maximum.entities', SEASONAL_DEFAULT_MAXIMUM_ENTITIES)) || SEASONAL_DEFAULT_MAXIMUM_ENTITIES
});

/** HabboQuestEngine.getQuestRoomIds: the rooms of the campaign live in the external texts. */
export const getSeasonalQuestRoomIds = (prefix: string): string => {
    const key = `quests.${prefix}.roomids`;
    const value = LocalizeText(key);

    return value && value !== key ? value : '';
};

/**
 * The seasonal calendar window of the quest engine (MainWindow + Calendar + CatalogPromo): the
 * seasonal quests come from SeasonalQuests (1122) after GetSeasonalQuestsOnly (1190), and every
 * answer opens the window, as the official MainWindow does. It asks on the first login of the day,
 * after a seasonal quest is completed, when the date changes while it was opened once, and when the
 * quests toolbar toggles it.
 */
const useSeasonalCalendarState = () => {
    const [quests, setQuests] = useState<QuestMessageData[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [prepared, setPrepared] = useState(false);
    const [dailyOffer, setDailyOffer] = useState<SeasonalCalendarOffer>(null);
    const { isFirstLoginOfDay = null } = useFirstLoginOfDay();
    const autoOpenedRef = useRef(false);
    const lastDateRef = useRef(new Date().getDate());
    const { enabled, prefix } = getSeasonalCalendarSettings();
    const active = enabled && prefix.length > 0;

    const requestSeasonalQuests = useCallback(() => {
        if (!active) return;

        SendMessageComposer(new GetSeasonalQuestsOnlyMessageComposer());
    }, [active]);

    const requestDailyOffer = useCallback(() => SendMessageComposer(new GetSeasonalCalendarDailyOfferComposer()), []);

    const close = useCallback(() => setIsVisible(false), []);

    /** MainWindow toggle: hide it, or ask the server and let the answer open it. */
    const toggle = useCallback(() => {
        if (isVisible) {
            setIsVisible(false);
            return;
        }

        requestSeasonalQuests();
    }, [isVisible, requestSeasonalQuests]);

    /** HabboQuestEngine `questengine/gotorooms`: a random room of `quests.<prefix>.roomids`. */
    const goToQuestRoom = useCallback(() => {
        const roomId = pickSeasonalQuestRoomId(getSeasonalQuestRoomIds(prefix));

        if (roomId) CreateLinkEvent(`navigator/goto/${roomId}`);
    }, [prefix]);

    useMessageEvent<SeasonalQuestsMessageEvent>(SeasonalQuestsMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !active) return;

        setQuests((parser.quests ?? []).filter((quest) => isSeasonalQuest(quest, prefix)));
        setIsVisible(true);
        setPrepared(true);
    });

    /** MainWindow QUEST_SEASONAL: a finished seasonal quest refreshes (and reopens) the calendar. */
    useMessageEvent<QuestCompletedMessageEvent>(QuestCompletedMessageEvent, (event) => {
        const quest = event.getParser()?.questData;

        if (!quest || !active || !isSeasonalQuest(quest, prefix)) return;

        requestSeasonalQuests();
    });

    useMessageEvent<SeasonalCalendarDailyOfferMessageEvent>(SeasonalCalendarDailyOfferMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser?.data) return;

        setDailyOffer({ pageId: parser.pageId, offer: parser.data });
    });

    /** CatalogPromo: a republished catalogue asks for the offer again. */
    useMessageEvent<CatalogPublishedMessageEvent>(CatalogPublishedMessageEvent, () => {
        if (prepared) requestDailyOffer();
    });

    // MainWindow.update: the first login of the day opens the calendar once.
    useEffect(() => {
        if (!active || !isFirstLoginOfDay || autoOpenedRef.current) return;

        autoOpenedRef.current = true;
        requestSeasonalQuests();
    }, [active, isFirstLoginOfDay, requestSeasonalQuests]);

    // CatalogPromo.prepare: the offer of the day is asked for when the window is first built.
    useEffect(() => {
        if (prepared) requestDailyOffer();
    }, [prepared, requestDailyOffer]);

    // Calendar.TimerEvent: once built, a new day asks for the quests again.
    useEffect(() => {
        if (!prepared || !active) return;

        lastDateRef.current = new Date().getDate();

        const interval = window.setInterval(() => {
            const now = new Date();

            if (hasSeasonalDateChanged(lastDateRef.current, now)) requestSeasonalQuests();

            lastDateRef.current = now.getDate();
        }, SEASONAL_DAILY_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, [prepared, active, requestSeasonalQuests]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length >= 2 && parts[1] === 'gotorooms') goToQuestRoom();
            },
            eventUrlPrefix: 'questengine/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [goToQuestRoom]);

    return {
        enabled: active,
        prefix,
        quests,
        isVisible,
        dailyOffer,
        requestSeasonalQuests,
        toggle,
        close,
        goToQuestRoom
    };
};

registerSharedHook(useSeasonalCalendarState);

export const useSeasonalCalendar = () => useSharedHook(useSeasonalCalendarState);

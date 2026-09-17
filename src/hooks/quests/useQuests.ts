import {
    AcceptQuestMessageComposer,
    ActivateQuestMessageComposer,
    CancelQuestMessageComposer,
    GetDailyQuestMessageComposer,
    GetQuestsMessageComposer,
    OpenQuestTrackerMessageComposer,
    QuestCancelledMessageEvent,
    QuestCompletedMessageEvent,
    QuestDailyMessageEvent,
    QuestMessageData,
    QuestMessageEvent,
    QuestsMessageEvent,
    RejectQuestMessageComposer,
    StartCampaignMessageComposer
} from '@octane/renderer';
import { useCallback, useMemo, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { localizeWithFallback, NotificationAlertType, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { useRoom } from '../rooms';

export interface QuestCompletion {
    quest: QuestMessageData;
    showDialog: boolean;
    receivedAt: number;
}

export interface DailyQuestState {
    quest: QuestMessageData;
    easyQuestCount: number;
    hardQuestCount: number;
}

/**
 * The quest engine state of the official client (HabboQuestEngine + QuestController): the campaign
 * list, the tracked quest, the last completion and the daily quest of the landing widget.
 */
const useQuestsState = () => {
    const [quests, setQuests] = useState<QuestMessageData[]>([]);
    const [openRequests, setOpenRequests] = useState(0);
    const [trackedQuest, setTrackedQuest] = useState<QuestMessageData>(null);
    const [completion, setCompletion] = useState<QuestCompletion>(null);
    const [dailyQuest, setDailyQuest] = useState<DailyQuestState>(null);
    const { roomSession = null } = useRoom();
    const { simpleAlert = null } = useNotification();

    const isInRoom = !!roomSession;

    const requestQuests = useCallback(() => SendMessageComposer(new GetQuestsMessageComposer()), []);

    /** Inside a room the official client accepts, outside it activates (hotel view, daily widget). */
    const acceptQuest = useCallback(
        (questId: number) => {
            if (isInRoom) SendMessageComposer(new AcceptQuestMessageComposer(questId));
            else SendMessageComposer(new ActivateQuestMessageComposer(questId));
        },
        [isInRoom]
    );

    const rejectQuest = useCallback((questId: number) => SendMessageComposer(new RejectQuestMessageComposer(questId)), []);

    const cancelDailyQuest = useCallback(() => SendMessageComposer(new CancelQuestMessageComposer()), []);

    /** The tracker asks for the next quest after the completion animation. */
    const requestNextQuest = useCallback(() => SendMessageComposer(new OpenQuestTrackerMessageComposer()), []);

    const startCampaign = useCallback((campaignCode: string) => SendMessageComposer(new StartCampaignMessageComposer(campaignCode)), []);

    const requestDailyQuest = useCallback((easy: boolean, index: number) => SendMessageComposer(new GetDailyQuestMessageComposer(easy, index)), []);

    const clearCompletion = useCallback(() => setCompletion(null), []);

    const clearTrackedQuest = useCallback(() => setTrackedQuest(null), []);

    const replaceQuestInList = useCallback((quest: QuestMessageData, accepted: boolean) => {
        setQuests((prevValue) =>
            prevValue.map((existing) => {
                if (existing.campaignCode !== quest.campaignCode) return existing;

                if (existing.id === quest.id) return quest;

                existing.accepted = accepted && existing.id === quest.id;

                return existing;
            })
        );
    }, []);

    useMessageEvent<QuestsMessageEvent>(QuestsMessageEvent, (event) => {
        const parser = event.getParser();

        setQuests(parser.quests.filter((quest) => !quest.isSeasonal));

        if (parser.openWindow) setOpenRequests((prevValue) => prevValue + 1);
    });

    useMessageEvent<QuestMessageEvent>(QuestMessageEvent, (event) => {
        const quest = event.getParser().quest;

        if (!quest) return;

        setTrackedQuest(quest);
        replaceQuestInList(quest, quest.accepted);
    });

    useMessageEvent<QuestCompletedMessageEvent>(QuestCompletedMessageEvent, (event) => {
        const parser = event.getParser();
        const quest = parser.questData;

        if (!quest) return;

        setCompletion({ quest, showDialog: parser.showDialog, receivedAt: Date.now() });
        setTrackedQuest(quest);
    });

    useMessageEvent<QuestCancelledMessageEvent>(QuestCancelledMessageEvent, (event) => {
        const parser = event.getParser();
        const quest = parser.quest;

        if (!quest) return;

        setTrackedQuest((prevValue) => (prevValue && prevValue.campaignChainCode === quest.campaignChainCode ? null : prevValue));
        replaceQuestInList(quest, false);

        if (parser.expired && simpleAlert) {
            simpleAlert(
                localizeWithFallback('quests.expired.body', 'The quest you were doing has expired.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('quests.expired.title', 'Quest expired')
            );
        }
    });

    useMessageEvent<QuestDailyMessageEvent>(QuestDailyMessageEvent, (event) => {
        const parser = event.getParser();

        setDailyQuest({ quest: parser.quest ?? null, easyQuestCount: parser.easyQuestCount ?? 0, hardQuestCount: parser.hardQuestCount ?? 0 });
    });

    const acceptedQuest = useMemo(() => quests.find((quest) => quest.accepted) ?? null, [quests]);

    return {
        quests,
        openRequests,
        trackedQuest,
        completion,
        dailyQuest,
        acceptedQuest,
        isInRoom,
        requestQuests,
        acceptQuest,
        rejectQuest,
        cancelDailyQuest,
        requestNextQuest,
        startCampaign,
        requestDailyQuest,
        clearCompletion,
        clearTrackedQuest
    };
};

registerSharedHook(useQuestsState);

export const useQuests = () => useSharedHook(useQuestsState);

import {
    AddLinkEventTracker,
    CreateLinkEvent,
    GetSessionDataManager,
    ILinkEventTracker,
    QuestMessageData,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { Button, DraggableWindowPosition, Text } from '../../common';
import { useQuests } from '../../hooks';
import { OctaneCard } from '../../layout';
import { QuestEntryView } from './QuestEntryView';

/**
 * The official Quests window (512x448): one row per campaign with the current quest, plus the HC
 * double-duckets footer. `quests/show|hide|toggle|details` and `questengine/quests` open it.
 */
export const QuestsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [detailsQuest, setDetailsQuest] = useState<QuestMessageData>(null);
    const { quests = [], openRequests = 0, trackedQuest = null, requestQuests = null, acceptQuest = null, rejectQuest = null } = useQuests();

    const hasClub = GetSessionDataManager().clubLevel > 0;

    const show = useCallback(() => {
        setIsVisible(true);
        requestQuests && requestQuests();
    }, [requestQuests]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        show();
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => {
                            if (!prevValue) requestQuests && requestQuests();

                            return !prevValue;
                        });
                        return;
                    case 'details':
                        setDetailsQuest(trackedQuest);
                        return;
                }
            },
            eventUrlPrefix: 'quests/'
        };

        const engineTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length >= 2 && parts[1] === 'quests') show();
            },
            eventUrlPrefix: 'questengine/'
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(engineTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(engineTracker);
        };
    }, [show, requestQuests, trackedQuest]);

    useEffect(() => {
        if (openRequests > 0) setIsVisible(true);
    }, [openRequests]);

    useEffect(() => {
        if (!detailsQuest) return;

        const current = quests.find((quest) => quest.id === detailsQuest.id);

        if (current && current !== detailsQuest) setDetailsQuest(current);
    }, [quests, detailsQuest]);

    const onAccept = useCallback(
        (quest: QuestMessageData) => {
            acceptQuest && acceptQuest(quest.id);
            setDetailsQuest(null);
        },
        [acceptQuest]
    );

    const onReject = useCallback(
        (quest: QuestMessageData) => {
            rejectQuest && rejectQuest(quest.id);
            setDetailsQuest(null);
        },
        [rejectQuest]
    );

    return (
        <>
            {isVisible && (
                <OctaneCard className="octane-quests" uniqueKey="quests" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={-30}>
                    <OctaneCard.Header headerText={localizeWithFallback('quests.list.caption', 'Quests')} onCloseClick={() => setIsVisible(false)} />
                    <OctaneCard.Content className="octane-quests-content">
                        <div className="octane-quests-list">
                            {quests.map((quest) => (
                                <QuestEntryView
                                    key={`${quest.campaignCode}-${quest.id}`}
                                    quest={quest}
                                    onAccept={onAccept}
                                    onReject={onReject}
                                    onDetails={setDetailsQuest}
                                />
                            ))}
                        </div>
                        <div className="octane-quests-hc-info">
                            <Text small>
                                {hasClub
                                    ? localizeWithFallback('hc.has.double_duckets.info', 'You get double duckets as you are an HC member!')
                                    : localizeWithFallback('hc.get.double_duckets.info', 'Get HC membership to gain double duckets!')}
                            </Text>
                            {!hasClub && (
                                <Button variant="success" onClick={() => CreateLinkEvent('catalog/open/hc_membership')}>
                                    {localizeWithFallback('generic.get_hc', 'Get HC')}
                                </Button>
                            )}
                        </div>
                    </OctaneCard.Content>
                </OctaneCard>
            )}
            {detailsQuest && (
                <OctaneCard className="octane-quest-details" uniqueKey="quest-details" windowPosition={DraggableWindowPosition.CENTER}>
                    <OctaneCard.Header headerText={localizeWithFallback('quests.details.caption', 'Quest details')} onCloseClick={() => setDetailsQuest(null)} />
                    <OctaneCard.Content className="octane-quest-details-content">
                        <QuestEntryView quest={detailsQuest} showHint onAccept={onAccept} onReject={onReject} />
                        {detailsQuest.catalogPageName && detailsQuest.catalogPageName.length > 0 && (
                            <span className="octane-quest-link" onClick={() => CreateLinkEvent(`catalog/open/${detailsQuest.catalogPageName}`)}>
                                {localizeWithFallback('quests.list.opencatalog', 'Open the catalogue')}
                            </span>
                        )}
                    </OctaneCard.Content>
                </OctaneCard>
            )}
        </>
    );
};

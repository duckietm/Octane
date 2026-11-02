import {
    AddLinkEventTracker,
    CampaignCalendarData,
    CampaignCalendarDataMessageEvent,
    CampaignCalendarDoorOpenedMessageEvent,
    ILinkEventTracker,
    OpenCampaignCalendarDoorAsStaffComposer,
    OpenCampaignCalendarDoorComposer,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { CalendarItem, SendMessageComposer } from '../../api';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useMessageEvent } from '../../hooks';
import { CalendarView } from './CalendarView';

export const CampaignView: FC<{}> = (props) => {
    const [calendarData, setCalendarData] = useState<CampaignCalendarData>(null);
    const pendingDoorRef = useRef(-1);
    const [receivedProducts, setReceivedProducts] = useState<Map<number, CalendarItem>>(new Map());
    const [isCalendarOpen, setCalendarOpen] = useState(false);

    const openPackage = (id: number, asStaff = false) => {
        // One door at a time: the answer names no door, so two quick clicks used to file the first door's prize under
        // the second and leave the second closed.
        if (!calendarData || pendingDoorRef.current !== -1) return;

        pendingDoorRef.current = id;

        if (asStaff) {
            SendMessageComposer(new OpenCampaignCalendarDoorAsStaffComposer(calendarData.campaignName, id));
        } else {
            SendMessageComposer(new OpenCampaignCalendarDoorComposer(calendarData.campaignName, id));
        }
    };

    useMessageEvent<CampaignCalendarDataMessageEvent>(CampaignCalendarDataMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        pendingDoorRef.current = -1;
        setCalendarData(parser.calendarData);
    });

    useMessageEvent<CampaignCalendarDoorOpenedMessageEvent>(CampaignCalendarDoorOpenedMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const lastAttempt = pendingDoorRef.current;
        pendingDoorRef.current = -1;

        if (lastAttempt === -1) return;

        if (parser.doorOpened) {
            setCalendarData((prev) => {
                const copy = prev.clone();
                copy.openedDays.push(lastAttempt);

                return copy;
            });

            const reward = new CalendarItem(parser.productName, parser.customImage, parser.furnitureClassName, {
                badgeCode: parser.badgeCode,
                credits: parser.credits,
                pixels: parser.pixels,
                points: parser.points,
                pointsType: parser.pointsType,
                subscriptionType: parser.subscriptionType,
                subscriptionDays: parser.subscriptionDays
            });

            setReceivedProducts((prev) => {
                const copy = new Map(prev);
                copy.set(lastAttempt, reward);

                return copy;
            });
        }

    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const value = url.split('/');

                if (value.length < 2) return;

                switch (value[1]) {
                    case 'calendar':
                        setCalendarOpen(true);
                        break;
                }
            },
            eventUrlPrefix: 'openView/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    return (
        <NativeTextTree>
            <>
                {calendarData && isCalendarOpen && (
                    <CalendarView
                        campaignName={calendarData.campaignName}
                        currentDay={calendarData.currentDay}
                        missedDays={calendarData.missedDays}
                        numDays={calendarData.campaignDays}
                        openedDays={calendarData.openedDays}
                        openedRewards={calendarData.openedRewards}
                        openPackage={openPackage}
                        receivedProducts={receivedProducts}
                        onClose={() => setCalendarOpen(false)}
                    />
                )}
            </>
        </NativeTextTree>
    );
};

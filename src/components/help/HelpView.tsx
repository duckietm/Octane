import { AddLinkEventTracker, GetGuideReportingStatusMessageComposer, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, ReportState, ReportType, SendMessageComposer } from '../../api';
import { Column, Grid, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useHelp, useWelcomeTour } from '../../hooks';
import { DescribeReportView } from './views/DescribeReportView';
import { HabboWayQuizView } from './views/HabboWayQuizView';
import { HabboWayView } from './views/HabboWayView';
import { HelpIndexView } from './views/HelpIndexView';
import { NameChangeView } from './views/name-change/NameChangeView';
import { PendingGuideTicketView } from './views/PendingGuideTicketView';
import { ReportSummaryView } from './views/ReportSummaryView';
import { SafetyBookletView } from './views/SafetyBookletView';
import { SanctionSatusView } from './views/SanctionStatusView';
import { SelectReportedChatsView } from './views/SelectReportedChatsView';
import { SelectReportedUserView } from './views/SelectReportedUserView';
import { SelectTopicView } from './views/SelectTopicView';
import { WelcomeTourPopupView } from './views/WelcomeTourPopupView';

export const HelpView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const { activeReport = null, setActiveReport = null, report = null } = useHelp();
    const { acceptTour = null } = useWelcomeTour();

    const onClose = () => {
        setActiveReport(null);
        setIsVisible(false);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        // Official HabboHelp.onGuideReportingStatus: an open guide ticket shows its pending popup.
                        SendMessageComposer(new GetGuideReportingStatusMessageComposer());
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => {
                            if (!prevValue) SendMessageComposer(new GetGuideReportingStatusMessageComposer());

                            return !prevValue;
                        });
                        return;
                    case 'tour':
                        // Official requestGuide(): a tour-type guide request, only when guides are enabled.
                        if (GetConfigurationValue<boolean>('guides.enabled', false)) acceptTour();
                        return;
                    case 'report':
                        // Official HabboHelp.linkReceived("help/report/room/<id>/<name>") -> reportRoom.
                        if (parts.length >= 5 && parts[2] === 'room') {
                            const roomId = parseInt(parts[3]);
                            const roomName = unescape(parts.slice(4).join('/'));

                            if (!isNaN(roomId)) report?.(ReportType.ROOM, { roomId, roomName });
                        }
                        return;
                }
            },
            eventUrlPrefix: 'help/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [acceptTour, report]);

    useEffect(() => {
        if (!activeReport) return;

        setIsVisible(true);
    }, [activeReport]);

    const CurrentStepView = () => {
        if (activeReport) {
            switch (activeReport.currentStep) {
                case ReportState.SELECT_USER:
                    return <SelectReportedUserView />;
                case ReportState.SELECT_CHATS:
                    return <SelectReportedChatsView />;
                case ReportState.SELECT_TOPICS:
                    return <SelectTopicView />;
                case ReportState.INPUT_REPORT_MESSAGE:
                    return <DescribeReportView />;
                case ReportState.REPORT_SUMMARY:
                    return <ReportSummaryView />;
            }
        }

        return <HelpIndexView />;
    };

    return (
        <>
            {isVisible && (
                <OctaneCardView
                    className="octane-help min-w-0 w-[min(560px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                    theme="primary-slim"
                >
                    <OctaneCardHeaderView headerText={LocalizeText('help.button.cfh')} onCloseClick={onClose} />
                    <OctaneCardContentView className="text-black">
                        {activeReport ? (
                            <Grid>
                                <Column center overflow="hidden" size={5}>
                                    <div className="index-image" />
                                </Column>
                                <Column justifyContent="between" overflow="hidden" size={7}>
                                    <CurrentStepView />
                                </Column>
                            </Grid>
                        ) : (
                            <CurrentStepView />
                        )}
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
            <SanctionSatusView />
            <NameChangeView />
            <HabboWayView />
            <HabboWayQuizView />
            <SafetyBookletView />
            <PendingGuideTicketView />
            <WelcomeTourPopupView />
        </>
    );
};

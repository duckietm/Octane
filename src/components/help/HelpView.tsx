import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, ReportState, ReportType } from '../../api';
import { Column, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useHelp } from '../../hooks';
import { ChatReviewReporterFeedbackView } from './views/ChatReviewReporterFeedbackView';
import { HabboWayWindowsView } from './habbo-way/HabboWayWindowsView';
import { DescribeReportView } from './views/DescribeReportView';
import { HelpIndexView } from './views/HelpIndexView';
import { NameChangeView } from './views/name-change/NameChangeView';
import { PendingBullyReportView } from './views/PendingBullyReportView';
import { ReportSummaryView } from './views/ReportSummaryView';
import { MyReportsStatusView } from './views/MyReportsStatusView';
import { SanctionSatusView } from './views/SanctionStatusView';
import { SelectReportedChatsView } from './views/SelectReportedChatsView';
import { SelectReportedUserView } from './views/SelectReportedUserView';
import { SelectTopicView } from './views/SelectTopicView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

export const HelpView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const { activeReport = null, setActiveReport = null, report = null } = useHelp();

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
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                    case 'tour':
                        // The guide tool sends the tour request (official HabboHelp.requestGuide).
                        return;
                    case 'report':
                        // help/report/room/<id>/<name>: a room report, as from the room info.
                        if (parts.length >= 5 && parts[2] === 'room') {
                            const roomId = parseInt(parts[3], 10);

                            if (Number.isFinite(roomId) && roomId > 0) report?.(ReportType.ROOM, { roomId, roomName: unescape(parts.slice(4).join('/')) });
                        }
                        return;
                }
            },
            eventUrlPrefix: 'help/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [report]);

    useEffect(() => {
        if (!activeReport) return;

        setIsVisible(true);
    }, [activeReport]);

    // "Back" on the first step leaves the report, so only a step of the report takes the two columns.
    const isReporting = !!activeReport && activeReport.currentStep >= ReportState.SELECT_USER;

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
        <NativeTextTree>
            <>
                {isVisible && (
                    <OctaneCardView
                        className={`octane-help min-w-0 ${isReporting ? 'w-[min(448px,calc(100vw-16px))]' : 'w-[min(420px,calc(100vw-16px))]'} max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]`}
                        theme="primary-slim"
                    >
                        <OctaneCardHeaderView headerText={LocalizeText('help.button.cfh')} onCloseClick={onClose} />
                        <OctaneCardContentView className="text-black">
                            {isReporting ? (
                                <Column grow className="octane-help-report" gap={2} justifyContent="between" overflow="hidden">
                                    <CurrentStepView />
                                </Column>
                            ) : (
                                <CurrentStepView />
                            )}
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
                <ChatReviewReporterFeedbackView />
                <PendingBullyReportView />
                <SanctionSatusView />
                <MyReportsStatusView />
                <NameChangeView />
                <HabboWayWindowsView />
            </>
        </NativeTextTree>
    );
};

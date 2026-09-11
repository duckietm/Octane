import {
    CallForHelpFromForumMessageMessageComposer,
    CallForHelpFromForumThreadMessageComposer,
    CallForHelpFromIMMessageComposer,
    CallForHelpFromPhotoMessageComposer,
    CallForHelpMessageComposer,
    ChatReviewSessionCreateMessageComposer
} from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText, ReportType, SendMessageComposer } from '../../../api';
import { Button, Text } from '../../../common';
import { useHelp } from '../../../hooks';

export const ReportSummaryView: FC<{}> = (props) => {
    const { activeReport = null, setActiveReport = null, ignoreAndUnfriendReportedUser = null } = useHelp();

    const submitReport = () => {
        const chats: (string | number)[] = [];

        // Official class_2390 and friends: every CallForHelp composer ends with the reporter
        // name and e-mail, filled in only by the unlawful-activity branch.
        const reporterName = activeReport.reporterName ?? '';
        const reporterEmail = activeReport.reporterEmail ?? '';

        switch (activeReport.reportType) {
            // A bullying report opens a guardian chat review, not a call for help:
            // `HabboHelp.reportBully` sends ChatReviewSessionCreate(reportedUserId, roomId)
            // and the emulator answers it in ReportBullyEvent.
            case ReportType.BULLY: {
                const bullyRoomId = activeReport.roomId <= 0 ? (activeReport.reportedChats[0]?.roomId ?? 0) : activeReport.roomId;

                SendMessageComposer(new ChatReviewSessionCreateMessageComposer(activeReport.reportedUserId, bullyRoomId));
                break;
            }
            case ReportType.EMERGENCY:
            case ReportType.ROOM: {
                const reportedRoomId = activeReport.roomId <= 0 ? activeReport.reportedChats[0].roomId : activeReport.roomId;

                activeReport.reportedChats.forEach((entry) => chats.push(entry.webId, entry.message));

                SendMessageComposer(
                    new CallForHelpMessageComposer(
                        activeReport.message,
                        activeReport.cfhTopic,
                        activeReport.reportedUserId,
                        reportedRoomId,
                        chats,
                        reporterName,
                        reporterEmail
                    )
                );
                break;
            }
            case ReportType.IM:
                activeReport.reportedChats.forEach((entry) => chats.push(entry.webId, entry.message));

                SendMessageComposer(
                    new CallForHelpFromIMMessageComposer(
                        activeReport.message,
                        activeReport.cfhTopic,
                        activeReport.reportedUserId,
                        chats,
                        reporterName,
                        reporterEmail
                    )
                );
                break;
            case ReportType.THREAD:
                SendMessageComposer(
                    new CallForHelpFromForumThreadMessageComposer(
                        activeReport.groupId,
                        activeReport.threadId,
                        activeReport.cfhTopic,
                        activeReport.message,
                        reporterName,
                        reporterEmail
                    )
                );
                break;
            case ReportType.MESSAGE:
                SendMessageComposer(
                    new CallForHelpFromForumMessageMessageComposer(
                        activeReport.groupId,
                        activeReport.threadId,
                        activeReport.messageId,
                        activeReport.cfhTopic,
                        activeReport.message,
                        reporterName,
                        reporterEmail
                    )
                );
                break;
            case ReportType.PHOTO:
                SendMessageComposer(
                    new CallForHelpFromPhotoMessageComposer(
                        activeReport.extraData,
                        activeReport.roomId,
                        activeReport.reportedUserId,
                        activeReport.cfhTopic,
                        activeReport.roomObjectId,
                        reporterName,
                        reporterEmail
                    )
                );
                break;
        }

        ignoreAndUnfriendReportedUser?.(activeReport.reportedUserId, activeReport.cfhTopic);

        setActiveReport(null);
    };

    return (
        <>
            <div className="flex flex-col gap-1">
                <Text fontSize={4}>{LocalizeText('help.cfh.button.send')}</Text>
                <Text>{LocalizeText('help.main.summary')}</Text>
            </div>
            <Button variant="success" onClick={submitReport}>
                {LocalizeText('guide.help.request.emergency.submit.button')}
            </Button>
        </>
    );
};

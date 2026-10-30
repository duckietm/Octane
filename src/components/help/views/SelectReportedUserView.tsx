import { ChatReviewSessionCreateMessageComposer, GetSessionDataManager, RoomObjectType } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { ChatEntryType, GetRoomSession, guardianText, IReportedUser, LocalizeText, ReportState, ReportType, SendMessageComposer } from '../../../api';
import { AutoGrid, Button, Column, Flex, LayoutAvatarImageView, LayoutGridItem, Text } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { isGuardiansEnabled, useChatHistory, useHelp } from '../../../hooks';

export const SelectReportedUserView: FC<{}> = (props) => {
    const { chatHistory = [] } = useChatHistory();
    const { activeReport = null, setActiveReport = null } = useHelp();
    // AIR bully_report: with the Guardians on, a bully report is only the user, sent for review.
    const isGuardianReport = activeReport?.reportType === ReportType.BULLY && isGuardiansEnabled();
    const [selectedUserId, setSelectedUserId] = useState(() => (isGuardianReport && activeReport.reportedUserId > 0 ? activeReport.reportedUserId : -1));

    /** The room each user last chatted in, where the guardians read the chat log. */
    const userRooms = useMemo(() => {
        const rooms: Map<number, number> = new Map();

        chatHistory.forEach((chat) => {
            if (chat.type === ChatEntryType.TYPE_CHAT && chat.entityType === RoomObjectType.USER) rooms.set(chat.webId, chat.roomId);
        });

        return rooms;
    }, [chatHistory]);

    const availableUsers = useMemo(() => {
        const users: Map<number, IReportedUser> = new Map();

        chatHistory.forEach((chat) => {
            if (
                chat.type === ChatEntryType.TYPE_CHAT &&
                chat.entityType === RoomObjectType.USER &&
                chat.webId !== GetSessionDataManager().userId &&
                !users.has(chat.webId)
            )
                users.set(chat.webId, { id: chat.webId, username: chat.name, look: chat.look });
        });

        return Array.from(users.values());
    }, [chatHistory]);

    const submitUser = (userId: number) => {
        if (userId <= 0) return;

        if (isGuardianReport) {
            const roomId = userRooms.get(userId) ?? GetRoomSession()?.roomId ?? -1;

            SendMessageComposer(new ChatReviewSessionCreateMessageComposer(userId, roomId));
            setActiveReport(null);
            return;
        }

        setActiveReport((prevValue) => {
            return { ...prevValue, reportedUserId: userId, currentStep: ReportState.SELECT_CHATS };
        });
    };

    const selectUser = (userId: number) => {
        setSelectedUserId((prevValue) => {
            if (userId === prevValue) return -1;

            return userId;
        });
    };

    const back = () => {
        setActiveReport((prevValue) => {
            return { ...prevValue, currentStep: prevValue.currentStep - 1 };
        });
    };

    return (
        <NativeTextTree>
            <>
                <div className="flex flex-col gap-1">
                    <Text fontSize={4}>{isGuardianReport ? guardianText('help.bully.subtitle') : LocalizeText('help.emergency.main.step.two.title')}</Text>
                    {availableUsers.length > 0 && <Text>{isGuardianReport ? guardianText('help.bully.description') : LocalizeText('report.user.pick.user')}</Text>}
                </div>
                <Column gap={1} overflow="hidden">
                    {!!!availableUsers.length && <Text>{LocalizeText('report.user.error.nolist')}</Text>}
                    {availableUsers.length > 0 && (
                        <AutoGrid columnCount={1} columnMinHeight={25} gap={1}>
                            {availableUsers.map((user, index) => {
                                return (
                                    <LayoutGridItem key={user.id} itemActive={selectedUserId === user.id} onClick={(event) => selectUser(user.id)}>
                                        <span className="octane-help-user">
                                            <span className="octane-help-user__avatar">
                                                <LayoutAvatarImageView headOnly compactHead compactHeadSize={30} compactHeadPadding={0} direction={2} figure={user.look ?? ''} />
                                            </span>
                                            <span className="octane-help-user__name">{user.username}</span>
                                        </span>
                                    </LayoutGridItem>
                                );
                            })}
                        </AutoGrid>
                    )}
                </Column>
                <Flex gap={2} justifyContent="between">
                    <Button variant="secondary" onClick={back}>
                        {LocalizeText('generic.back')}
                    </Button>
                    <Button disabled={selectedUserId <= 0} onClick={() => submitUser(selectedUserId)}>
                        {isGuardianReport ? guardianText('help.bully.submit') : LocalizeText('help.emergency.main.submit.button')}
                    </Button>
                </Flex>
            </>
        </NativeTextTree>
    );
};

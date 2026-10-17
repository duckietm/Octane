import { RoomObjectType } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { ChatEntryType, IChatEntry, localizeWithFallback, LocalizeText, ReportState, ReportType } from '../../../api';
import { AutoGrid, Button, Column, Flex, LayoutAvatarImageView, LayoutGridItem, Text } from '../../../common';
import { useChatHistory, useFriendsState, useHelp, useMessenger } from '../../../hooks';
import { BaseButton } from '../../../common/BaseButton';

export const SelectReportedChatsView: FC<{}> = (props) => {
    const [selectedChats, setSelectedChats] = useState<IChatEntry[]>([]);
    const { activeReport = null, setActiveReport = null } = useHelp();
    const { chatHistory = [], messengerHistory = [] } = useChatHistory();
    const { friends = [] } = useFriendsState();
    const { messageThreads = [] } = useMessenger();

    const userChats = useMemo(() => {
        switch (activeReport.reportType) {
            case ReportType.BULLY:
            case ReportType.EMERGENCY:
                return chatHistory.filter(
                    (chat) => chat.type === ChatEntryType.TYPE_CHAT && chat.webId === activeReport.reportedUserId && chat.entityType === RoomObjectType.USER
                );
            case ReportType.IM:
                return messengerHistory.filter((chat) => chat.webId === activeReport.reportedUserId && chat.type === ChatEntryType.TYPE_IM);
        }

        return [];
    }, [activeReport, chatHistory, messengerHistory]);

    const selectChat = (chatEntry: IChatEntry) => {
        setSelectedChats((prevValue) => {
            const newValue = [...prevValue];
            const index = newValue.indexOf(chatEntry);

            if (index >= 0) newValue.splice(index, 1);
            else newValue.push(chatEntry);

            return newValue;
        });
    };

    const submitChats = () => {
        if (!selectedChats || selectedChats.length <= 0) return;

        setActiveReport((prevValue) => {
            return { ...prevValue, reportedChats: selectedChats, currentStep: ReportState.SELECT_TOPICS };
        });
    };

    // The user picked in the step before, shown over the list with a way to pick another. An IM report names the
    // friend or messenger participant (its chat lines carry no look).
    const reportedUser = useMemo(() => {
        if (activeReport.reportType !== ReportType.IM) return userChats[0] ?? null;

        const reportedUserId = activeReport.reportedUserId;
        const friend = friends.find((entry) => entry.id === reportedUserId);
        const participant = messageThreads.find((thread) => thread.participant?.id === reportedUserId)?.participant;
        const name = friend?.name || participant?.name || userChats[0]?.name;

        return name ? { name, look: friend?.figure || participant?.figure || userChats[0]?.look || '' } : null;
    }, [activeReport, friends, messageThreads, userChats]);

    const changeUser = () => {
        setActiveReport((prevValue) => {
            return { ...prevValue, reportedUserId: -1, currentStep: ReportState.SELECT_USER };
        });
    };

    const back = () => {
        setActiveReport((prevValue) => {
            return { ...prevValue, currentStep: prevValue.currentStep - 1 };
        });
    };

    return (
        <>
            <div className="flex flex-col gap-1">
                <Text fontSize={4}>{LocalizeText('help.emergency.chat_report.subtitle')}</Text>
                <Text>{LocalizeText('help.emergency.chat_report.description')}</Text>
            </div>
            {reportedUser && (
                <div className="octane-help-selected-user">
                    <span className="octane-help-user__avatar">
                        <LayoutAvatarImageView headOnly compactHead compactHeadSize={30} compactHeadPadding={0} direction={2} figure={reportedUser.look ?? ''} />
                    </span>
                    <span className="octane-help-selected-user__text">
                        <span>{localizeWithFallback('help.cfh.selected_user.title', 'Selected user')}</span>
                        <b>{reportedUser.name}</b>
                    </span>
                    {activeReport.reportType !== ReportType.IM && (
                        <BaseButton className="help-link" type="button" onClick={changeUser}>
                            {localizeWithFallback('help.cfh.selected_user.change', 'Select another user')}
                        </BaseButton>
                    )}
                </div>
            )}
            <Column gap={1} overflow="hidden">
                {!userChats || (!userChats.length && <Text>{LocalizeText('help.cfh.error.no_user_data')}</Text>)}
                {userChats.length > 0 && (
                    <AutoGrid columnCount={1} columnMinHeight={25} gap={1} overflow="auto">
                        {userChats.map((chat, index) => {
                            return (
                                <LayoutGridItem key={chat.id} itemActive={selectedChats.indexOf(chat) >= 0} onClick={(event) => selectChat(chat)}>
                                    <Text>{chat.message}</Text>
                                </LayoutGridItem>
                            );
                        })}
                    </AutoGrid>
                )}
            </Column>
            <Flex gap={2} justifyContent="between">
                <Button disabled={activeReport.reportType === ReportType.IM} variant="secondary" onClick={back}>
                    {LocalizeText('generic.back')}
                </Button>
                <Button disabled={selectedChats.length <= 0} onClick={submitChats}>
                    {LocalizeText('help.emergency.main.submit.button')}
                </Button>
            </Flex>
        </>
    );
};

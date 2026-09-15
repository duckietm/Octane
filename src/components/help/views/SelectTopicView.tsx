import { FC, useState } from 'react';
import { LocalizeText, ReportState, ReportType } from '../../../api';
import { Button, Column, Flex, Text } from '../../../common';
import { useHelp, useModTools } from '../../../hooks';
import { getRoomReportTopicKey, ROOM_REPORT_TOPIC_ID } from './reportMessageRules';

export const SelectTopicView: FC<{}> = (props) => {
    const [selectedCategory, setSelectedCategory] = useState(-1);
    const [selectedTopic, setSelectedTopic] = useState(-1);
    const { activeReport = null, setActiveReport = null } = useHelp();
    const { cfhCategories = [] } = useModTools();
    // Official populateRoomReportButton: a room / group / event report offers one
    // topic only, "Inappropriate room/group/event", named after what is reported.
    const isRoomReport = activeReport?.reportType === ReportType.ROOM;

    const submitTopic = () => {
        if (selectedCategory < 0 || selectedTopic < 0) return;

        setActiveReport((prevValue) => {
            return {
                ...prevValue,
                cfhCategory: selectedCategory,
                cfhTopic: cfhCategories[selectedCategory].topics[selectedTopic].id,
                currentStep: ReportState.INPUT_REPORT_MESSAGE
            };
        });
    };

    const submitRoomTopic = () => {
        setActiveReport((prevValue) => {
            const cfhCategory = cfhCategories.findIndex((category) => category.topics.some((topic) => topic.id === ROOM_REPORT_TOPIC_ID));

            return { ...prevValue, cfhCategory, cfhTopic: ROOM_REPORT_TOPIC_ID, currentStep: ReportState.INPUT_REPORT_MESSAGE };
        });
    };

    const back = () => {
        setActiveReport((prevValue) => {
            return { ...prevValue, currentStep: prevValue.currentStep - 1 };
        });
    };

    if (isRoomReport) {
        return (
            <>
                <div className="flex flex-col gap-1">
                    <Text fontSize={4}>{LocalizeText('help.emergency.chat_report.subtitle')}</Text>
                    <Text>{LocalizeText('help.cfh.pick.topic')}</Text>
                </div>
                <Column gap={1} overflow="auto">
                    <Button variant="danger" onClick={submitRoomTopic}>
                        {LocalizeText(getRoomReportTopicKey(), ['name'], [activeReport?.roomName ?? ''])}
                    </Button>
                </Column>
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col gap-1">
                <Text fontSize={4}>{LocalizeText('help.emergency.chat_report.subtitle')}</Text>
                <Text>{LocalizeText('help.cfh.pick.topic')}</Text>
            </div>
            <Column gap={1} overflow="auto">
                {selectedCategory < 0 &&
                    cfhCategories.map((category, index) => (
                        <Button key={index} variant="danger" onClick={(event) => setSelectedCategory(index)}>
                            {LocalizeText(`help.cfh.reason.${category.name}`)}
                        </Button>
                    ))}
                {selectedCategory >= 0 &&
                    cfhCategories[selectedCategory].topics.map((topic, index) => (
                        <Button key={index} active={selectedTopic === index} variant="danger" onClick={(event) => setSelectedTopic(index)}>
                            {LocalizeText(`help.cfh.topic.${topic.id}`)}
                        </Button>
                    ))}
            </Column>
            <Flex gap={2} justifyContent="between">
                <Button variant="secondary" onClick={back}>
                    {LocalizeText('generic.back')}
                </Button>
                <Button disabled={selectedTopic < 0} onClick={submitTopic}>
                    {LocalizeText('help.emergency.main.submit.button')}
                </Button>
            </Flex>
        </>
    );
};

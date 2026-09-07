import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { Button, Flex, Text } from '../../../../../common';
import { useRoomPromote } from '../../../../../hooks';

interface RoomPromoteMyOwnEventWidgetViewProps {
    eventDescription: string;
    setIsEditingPromote: (value: boolean) => void;
}

export const RoomPromoteMyOwnEventWidgetView: FC<RoomPromoteMyOwnEventWidgetViewProps> = (props) => {
    const { eventDescription = '', setIsEditingPromote = null } = props;
    const { setIsExtended } = useRoomPromote();

    const extendPromote = () => {
        setIsExtended(true);
        CreateLinkEvent('catalog/open/room_event');
    };

    return (
        <>
            <Flex alignItems="center" gap={2} style={{ overflowWrap: 'anywhere' }}>
                <Text variant="white">{eventDescription}</Text>
            </Flex>
            <Flex className="mt-2" gap={2}>
                <Button
                    classNames={['flex-1', 'bg-[#9dd3ec]!', 'border-[#63a9c9]!', 'hover:bg-[#8ecae6]!', 'hover:border-[#63a9c9]!']}
                    variant="secondary"
                    onClick={() => setIsEditingPromote(true)}
                >
                    {LocalizeText('navigator.roominfo.editevent')}
                </Button>
                <Button classNames={['flex-1']} variant="success" onClick={() => extendPromote()}>
                    {LocalizeText('roomad.extend.event')}
                </Button>
            </Flex>
        </>
    );
};

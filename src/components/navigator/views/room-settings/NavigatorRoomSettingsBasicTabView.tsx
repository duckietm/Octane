import { RoomDeleteComposer, RoomSettingsSaveErrorEvent, RoomSettingsSaveErrorParser, YouTubeRoomSettingsComposer, YouTubeRoomSettingsEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { CreateLinkEvent, GetMaxVisitorsList, getYoutubeRoomEnabled, IRoomData, LocalizeText, SendMessageComposer, setYoutubeRoomEnabled } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useMessageEvent, useNavigatorData, useNotification, useSoundboard } from '../../../../hooks';

const ROOM_NAME_MIN_LENGTH = 3;
const ROOM_NAME_MAX_LENGTH = 60;
const DESC_MAX_LENGTH = 255;
const TAGS_MAX_LENGTH = 15;

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean | string[]) => void;
    onClose: () => void;
}

export const NavigatorRoomSettingsBasicTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null, onClose = null } = props;
    const [roomName, setRoomName] = useState<string>('');
    const [roomDescription, setRoomDescription] = useState<string>('');
    const [roomTag1, setRoomTag1] = useState<string>('');
    const [roomTag2, setRoomTag2] = useState<string>('');
    const [tagIndex, setTagIndex] = useState(0);
    const [typeError, setTypeError] = useState<string>('');
    const [youtubeEnabled, setYoutubeEnabled] = useState(getYoutubeRoomEnabled());
    const { showConfirm = null } = useNotification();
    const { categories } = useNavigatorData();
    const { enabled: soundboardEnabled, setRoomEnabled: setSoundboardEnabled } = useSoundboard();

    useMessageEvent<YouTubeRoomSettingsEvent>(YouTubeRoomSettingsEvent, (event) => {
        setYoutubeEnabled(event.getParser().youtubeEnabled);
    });

    const toggleYouTube = (enabled: boolean) => {
        setYoutubeEnabled(enabled);
        setYoutubeRoomEnabled(enabled);
        SendMessageComposer(new YouTubeRoomSettingsComposer(enabled));
    };

    useMessageEvent<RoomSettingsSaveErrorEvent>(RoomSettingsSaveErrorEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        switch (parser.code) {
            case RoomSettingsSaveErrorParser.ERROR_INVALID_TAG:
                setTypeError('navigator.roomsettings.unacceptablewords');
                break;
            case RoomSettingsSaveErrorParser.ERROR_NON_USER_CHOOSABLE_TAG:
                setTypeError('navigator.roomsettings.nonuserchoosabletag');
                break;
            default:
                setTypeError('');
                break;
        }
    });

    const deleteRoom = () => {
        showConfirm(
            LocalizeText('navigator.roomsettings.deleteroom.confirm.message', ['room_name'], [roomData.roomName]),
            () => {
                SendMessageComposer(new RoomDeleteComposer(roomData.roomId));

                if (onClose) onClose();

                CreateLinkEvent('navigator/search/myworld_view');
            },
            null,
            null,
            null,
            LocalizeText('navigator.roomsettings.deleteroom.confirm.title')
        );
    };

    const saveRoomName = (value = roomName) => {
        if (value === roomData.roomName || value.length < ROOM_NAME_MIN_LENGTH || value.length > ROOM_NAME_MAX_LENGTH) return;

        handleChange('name', value);
    };

    const saveRoomDescription = (value = roomDescription) => {
        if (value === roomData.roomDescription || value.length > DESC_MAX_LENGTH) return;

        handleChange('description', value);
    };

    const saveTags = (index: number) => {
        if (index === 0 && (roomTag1 === roomData.tags[0] || roomTag1.length > TAGS_MAX_LENGTH)) return;

        if (index === 1 && (roomTag2 === roomData.tags[1] || roomTag2.length > TAGS_MAX_LENGTH)) return;

        if (roomTag1 === '' && roomTag2 !== '') setRoomTag2('');

        setTypeError('');
        setTagIndex(index);
        handleChange('tags', roomTag1 === '' && roomTag2 !== '' ? [roomTag2] : [roomTag1, roomTag2]);
    };

    useEffect(() => {
        setRoomName(roomData.roomName);
        setRoomDescription(roomData.roomDescription);
        setRoomTag1(roomData.tags.length > 0 && roomData.tags[0] ? roomData.tags[0] : '');
        setRoomTag2(roomData.tags.length > 0 && roomData.tags[1] ? roomData.tags[1] : '');
    }, [roomData]);

    return (
        <>
            <Column gap={1}>
                <Text bold>{LocalizeText('navigator.roomname')}</Text>
                <input
                    className="form-control form-control-sm"
                    value={roomName}
                    maxLength={ROOM_NAME_MAX_LENGTH}
                    onChange={(event) => setRoomName(event.target.value)}
                    onBlur={(event) => saveRoomName(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') saveRoomName(event.currentTarget.value);
                    }}
                />
                {roomName.length < ROOM_NAME_MIN_LENGTH && (
                    <Text bold small variant="danger">
                        {LocalizeText('navigator.roomsettings.roomnameismandatory')}
                    </Text>
                )}
            </Column>
            <Column gap={1}>
                <Text bold>{LocalizeText('navigator.roomsettings.desc')}</Text>
                <textarea
                    className="form-control form-control-sm"
                    value={roomDescription}
                    maxLength={DESC_MAX_LENGTH}
                    onChange={(event) => setRoomDescription(event.target.value)}
                    onBlur={(event) => saveRoomDescription(event.currentTarget.value)}
                />
            </Column>
            <Column gap={1}>
                <Text bold>{LocalizeText('navigator.category')}</Text>
                <select className="form-select form-select-sm" value={roomData.categoryId} onChange={(event) => handleChange('category', event.target.value)}>
                    {categories &&
                        categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {LocalizeText(category.name)}
                            </option>
                        ))}
                </select>
            </Column>
            <Column gap={1}>
                <Text bold>{LocalizeText('navigator.maxvisitors')}</Text>
                <select
                    className="form-select form-select-sm"
                    value={roomData.userCount}
                    onChange={(event) => handleChange('max_visitors', event.target.value)}
                >
                    {GetMaxVisitorsList &&
                        GetMaxVisitorsList.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                </select>
            </Column>
            <Column gap={1}>
                <Text bold>{LocalizeText('navigator.tradesettings')}</Text>
                <select
                    className="form-select form-select-sm"
                    value={roomData.tradeState}
                    onChange={(event) => handleChange('trade_state', event.target.value)}
                >
                    <option value="0">{LocalizeText('navigator.roomsettings.trade_not_allowed')}</option>
                    <option value="1">{LocalizeText('navigator.roomsettings.trade_not_with_Controller')}</option>
                    <option value="2">{LocalizeText('navigator.roomsettings.trade_allowed')}</option>
                </select>
            </Column>
            <Column gap={1}>
                <Text bold>{LocalizeText('navigator.tags')}</Text>
                <Flex gap={1}>
                    <Column fullWidth gap={0}>
                        <input
                            className="form-control form-control-sm"
                            value={roomTag1}
                            onChange={(event) => setRoomTag1(event.target.value)}
                            onBlur={() => saveTags(0)}
                        />
                        {roomTag1.length > TAGS_MAX_LENGTH && (
                            <Text bold small variant="danger">
                                {LocalizeText('navigator.roomsettings.toomanycharacters')}
                            </Text>
                        )}
                        {tagIndex === 0 && typeError != '' && (
                            <Text bold small variant="danger">
                                {LocalizeText(typeError)}
                            </Text>
                        )}
                    </Column>
                    <Column fullWidth gap={0}>
                        <input
                            className="form-control form-control-sm"
                            value={roomTag2}
                            onChange={(event) => setRoomTag2(event.target.value)}
                            onBlur={() => saveTags(1)}
                        />
                        {roomTag2.length > TAGS_MAX_LENGTH && (
                            <Text bold small variant="danger">
                                {LocalizeText('navigator.roomsettings.toomanycharacters')}
                            </Text>
                        )}
                        {tagIndex === 1 && typeError != '' && (
                            <Text bold small variant="danger">
                                {LocalizeText(typeError)}
                            </Text>
                        )}
                    </Column>
                </Flex>
            </Column>
            <Flex alignItems="center" gap={1}>
                <input
                    className="form-check-input"
                    type="checkbox"
                    checked={roomData.allowWalkthrough}
                    onChange={(event) => handleChange('allow_walkthrough', event.target.checked)}
                />
                <Text>{LocalizeText('navigator.roomsettings.allow_walk_through')}</Text>
            </Flex>
            {/* Polaris-only. Keep when matching Habbo AIR chrome. */}
            <Flex alignItems="center" gap={1}>
                <input
                    className="form-check-input"
                    type="checkbox"
                    checked={roomData.allowUnderpass}
                    onChange={(event) => handleChange('allow_underpass', event.target.checked)}
                />
                <Text>{LocalizeText('navigator.roomsettings.allow_underpass')}</Text>
            </Flex>
            <Flex alignItems="center" gap={1}>
                <input
                    aria-label={LocalizeText('widget.room.youtube.shared')}
                    className="form-check-input"
                    type="checkbox"
                    checked={youtubeEnabled}
                    onChange={(event) => toggleYouTube(event.target.checked)}
                />
                <Text>{LocalizeText('widget.room.youtube.shared')}</Text>
            </Flex>
            <Flex alignItems="center" gap={1}>
                <input
                    aria-label={LocalizeText('soundboard.room.allow')}
                    className="form-check-input"
                    type="checkbox"
                    checked={soundboardEnabled}
                    onChange={(event) => setSoundboardEnabled(event.target.checked)}
                />
                <Text>{LocalizeText('soundboard.room.allow')}</Text>
            </Flex>
            <Flex pointer alignItems="center" justifyContent="center" gap={1} onClick={deleteRoom}>
                <FaTimes className="fa-icon shrink-0 text-[#a81a12]" />
                <Text variant="danger" underline bold className="whitespace-nowrap">
                    {LocalizeText('navigator.roomsettings.delete')}
                </Text>
            </Flex>
        </>
    );
};

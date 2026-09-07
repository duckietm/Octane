import {
    FlatControllerAddedEvent,
    FlatControllerRemovedEvent,
    FlatControllersEvent,
    RemoveAllRightsMessageComposer,
    RoomGiveRightsComposer,
    RoomTakeRightsComposer,
    RoomUsersWithRightsComposer
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, Grid, Text, UserProfileIconView } from '../../../../common';
import { useFriends, useMessageEvent } from '../../../../hooks';
import { NavigatorRoomSettingsSectionView } from './NavigatorRoomSettingsSectionView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

// Polaris Staff Chat is not a real friend; keep it out of the rights picker.
const STAFF_CHAT_ID = -1;
const STAFF_CHAT_NAME = 'Staff Chat';

export const NavigatorRoomSettingsRightsTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null } = props;
    const [usersWithRights, setUsersWithRights] = useState<Map<number, string>>(new Map());
    const { onlineFriends = [], offlineFriends = [] } = useFriends();
    const pendingActionsRef = useRef<Set<string>>(new Set());

    const guardedSend = (key: string, composer: any) => {
        if (pendingActionsRef.current.has(key)) return;

        pendingActionsRef.current.add(key);
        SendMessageComposer(composer);

        setTimeout(() => pendingActionsRef.current.delete(key), 2000);
    };

    const allFriendsRaw = [...onlineFriends, ...offlineFriends];

    const allFriends = allFriendsRaw.filter((friend) => {
        if (friend.id === STAFF_CHAT_ID) return false;
        if (friend.name === STAFF_CHAT_NAME) return false;
        if (friend.id <= 0) return false;

        return true;
    });

    const filteredUsersWithRights = new Map(
        Array.from(usersWithRights.entries()).filter(([id, name]) => {
            if (id === STAFF_CHAT_ID) return false;
            if (name === STAFF_CHAT_NAME) return false;
            if (id <= 0) return false;

            return true;
        })
    );

    const friendsWithoutRights = allFriends.filter((friend) => !filteredUsersWithRights.has(friend.id));

    useMessageEvent<FlatControllersEvent>(FlatControllersEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights(parser.users);
    });

    useMessageEvent<FlatControllerAddedEvent>(FlatControllerAddedEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.set(parser.data.userId, parser.data.userName);

            return newValue;
        });
    });

    useMessageEvent<FlatControllerRemovedEvent>(FlatControllerRemovedEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.delete(parser.userId);

            return newValue;
        });
    });

    useEffect(() => {
        if (!roomData) return;

        SendMessageComposer(new RoomUsersWithRightsComposer(roomData.roomId));
    }, [roomData]);

    return (
        <Grid>
            <Column size={6}>
                <NavigatorRoomSettingsSectionView
                    gap={1}
                    className="h-full"
                    title={LocalizeText(
                        'navigator.flatctrls.userswithrights',
                        ['displayed', 'total'],
                        [filteredUsersWithRights.size.toString(), filteredUsersWithRights.size.toString()]
                    )}
                >
                    <Flex overflow="hidden" className="octane-card-panel p-2 list-container">
                        <Column fullWidth overflow="auto" gap={1}>
                            {Array.from(filteredUsersWithRights.entries()).map(([id, name], index) => {
                                return (
                                    <Flex key={`${id}-${index}`} shrink alignItems="center" gap={1} overflow="hidden">
                                        <UserProfileIconView userId={id} />
                                        <Text pointer grow onClick={() => guardedSend(`take_${id}`, new RoomTakeRightsComposer(id))}>
                                            {name}
                                        </Text>
                                    </Flex>
                                );
                            })}
                        </Column>
                    </Flex>

                    <Button
                        variant="danger"
                        disabled={!filteredUsersWithRights.size}
                        onClick={() => roomData && guardedSend('removeAll', new RemoveAllRightsMessageComposer(roomData.roomId))}
                    >
                        {LocalizeText('navigator.flatctrls.clear')}
                    </Button>
                </NavigatorRoomSettingsSectionView>
            </Column>

            <Column size={6}>
                <NavigatorRoomSettingsSectionView
                    gap={1}
                    className="h-full"
                    title={LocalizeText(
                        'navigator.flatctrls.friends',
                        ['displayed', 'total'],
                        [friendsWithoutRights.length.toString(), allFriends.length.toString()]
                    )}
                >
                    <Flex overflow="hidden" className="octane-card-panel p-2 list-container">
                        <Column fullWidth overflow="auto" gap={1}>
                            {friendsWithoutRights.map((friend, index) => {
                                return (
                                    <Flex key={`${friend.id}-${index}`} shrink alignItems="center" gap={1} overflow="hidden">
                                        <UserProfileIconView userId={friend.id} />
                                        <Text pointer grow onClick={() => guardedSend(`give_${friend.id}`, new RoomGiveRightsComposer(friend.id))}>
                                            {friend.name}
                                        </Text>
                                    </Flex>
                                );
                            })}
                        </Column>
                    </Flex>
                </NavigatorRoomSettingsSectionView>
            </Column>
        </Grid>
    );
};

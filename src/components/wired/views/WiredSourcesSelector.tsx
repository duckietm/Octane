import {
    FurnitureFloorUpdateEvent,
    GetRoomEngine,
    GetSessionDataManager,
    RoomEngineObjectEvent,
    RoomObjectCategory,
    RoomObjectVariable,
    Triggerable
} from '@octane/renderer';
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { GetRoomSession, LocalizeText } from '../../../api';
import { Button, Text } from '../../../common';
import { useMessageEvent, useOctaneEvent, useWired } from '../../../hooks';

export const FURNI_SOURCES = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 201, label: 'wiredfurni.params.sources.furni.201' },
    { value: 0, label: 'wiredfurni.params.sources.furni.0' }
];

export const USER_SOURCES = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

export const CLICKED_USER_SOURCE_VALUE = 11;
export const CLICKED_USER_SOURCE = { value: CLICKED_USER_SOURCE_VALUE, label: 'wiredfurni.params.sources.users.11' };

export const BOT_SOURCES = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 100, label: 'wiredfurni.params.sources.users.100' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

export interface WiredSourceOption {
    value: number;
    label: string;
}

const FURNI_SOURCE_LABEL_ORDER = [
    'wiredfurni.params.sources.furni.100',
    'wiredfurni.params.sources.furni.101',
    'wiredfurni.params.sources.furni.200',
    'wiredfurni.params.sources.furni.201',
    'wiredfurni.params.sources.furni.0',
    'wiredfurni.params.sources.furni.900'
];

const USER_SOURCE_LABEL_ORDER = [
    'wiredfurni.params.sources.users.0',
    'wiredfurni.params.sources.users.11',
    'wiredfurni.params.sources.users.200',
    'wiredfurni.params.sources.users.201',
    'wiredfurni.params.sources.users.100',
    'wiredfurni.params.sources.users.101',
    'wiredfurni.params.sources.users.900'
];

const getSourceSortIndex = (label: string, category: 'furni' | 'users') => {
    const order = category === 'furni' ? FURNI_SOURCE_LABEL_ORDER : USER_SOURCE_LABEL_ORDER;
    const index = order.indexOf(label);

    return index >= 0 ? index : order.length + 1;
};

export const sortWiredSourceOptions = (options: WiredSourceOption[], category: 'furni' | 'users') => {
    return [...options].sort((left, right) => {
        const orderDifference = getSourceSortIndex(left.label, category) - getSourceSortIndex(right.label, category);

        if (orderDifference !== 0) return orderDifference;

        return left.value - right.value;
    });
};

/**
 * The sources the server allows for one furni or user slot of the box (its InputSourcesConf), in the server's order.
 * Labels the view passed for the same values are kept. Without a server list for that slot the view's own list stays.
 */
export const getServerSlotSources = (trigger: Triggerable, category: 'furni' | 'users', slot: number, fallback: WiredSourceOption[]): WiredSourceOption[] => {
    const conf = trigger?.inputSourcesConf;
    const allowed = category === 'furni' ? conf?.furniAllowed?.[slot] : conf?.userAllowed?.[slot];

    if (!allowed?.length) return fallback;

    // The clicked user source depends on the stack's trigger and is added separately.
    return allowed
        .filter((value) => value !== CLICKED_USER_SOURCE_VALUE)
        .map((value) => fallback.find((option) => option.value === value) ?? { value, label: `wiredfurni.params.sources.${category}.${value}` });
};

interface WiredSourcesSelectorProps {
    showFurni?: boolean;
    showUsers?: boolean;
    furniSource?: number;
    userSource?: number;
    furniTitle?: string;
    usersTitle?: string;
    furniSources?: WiredSourceOption[];
    userSources?: WiredSourceOption[];
    /** Which of the box's furni / user source slots this row edits, for the server's allowed sources. */
    furniSlot?: number;
    userSlot?: number;
    allowClickedUserSource?: boolean;
    furniDetail?: ReactNode;
    userDetail?: ReactNode;
    onChangeFurni?: (source: number) => void;
    onChangeUsers?: (source: number) => void;
}

const BOT_SOURCE_TITLE = 'wiredfurni.params.sources.users.title.bots';

const CLICK_USER_TRIGGER_NAME = 'wf_trg_click_user';
const BOT_REACHED_USER_TRIGGER_NAME = 'wf_trg_bot_reached_avtr';

export const REACHED_USER_SOURCE_VALUE = 10;
export const REACHED_USER_SOURCE = { value: REACHED_USER_SOURCE_VALUE, label: 'wiredfurni.params.sources.users.10' };

const matchesTriggerName = (value: string, triggerName: string) => !!value && value.toLowerCase().startsWith(triggerName);

/** Which of the stack-dependent user sources the box's stack offers: 11 under Click User, 10 under Bot Reaches User. */
const getStackUserSources = (trigger: Triggerable) => {
    const found = { clickedUser: false, reachedUser: false };

    if (!trigger) return found;

    const roomSession = GetRoomSession();
    const roomId = roomSession?.roomId ?? GetRoomEngine().activeRoomId;

    if (roomId == null || roomId < 0) return found;

    const triggerObject = GetRoomEngine().getRoomObject(roomId, trigger.id, RoomObjectCategory.FLOOR);

    if (!triggerObject) return found;

    const triggerLocation = triggerObject.getLocation();
    const roomObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR) || [];

    for (const roomObject of roomObjects) {
        if (!roomObject) continue;

        const location = roomObject.getLocation();

        if (!location || location.x !== triggerLocation.x || location.y !== triggerLocation.y) continue;

        const typeId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
        const furniData = GetSessionDataManager().getFloorItemData(typeId);
        const names = [furniData?.className, furniData?.fullName, furniData?.name];

        if (names.some((name) => matchesTriggerName(name, CLICK_USER_TRIGGER_NAME))) found.clickedUser = true;
        if (names.some((name) => matchesTriggerName(name, BOT_REACHED_USER_TRIGGER_NAME))) found.reachedUser = true;
    }

    return found;
};

/** Puts the stack-dependent sources right after the triggering user, as the official editor does. */
const insertAfterTrigger = (userSources: WiredSourceOption[], extra: WiredSourceOption[]) => {
    const missing = extra.filter((source) => !userSources.some((option) => option.value === source.value));

    if (!missing.length) return userSources;

    const triggerIndex = userSources.findIndex((option) => option.value === 0);

    if (triggerIndex === -1) return [...userSources, ...missing];

    return [...userSources.slice(0, triggerIndex + 1), ...missing, ...userSources.slice(triggerIndex + 1)];
};

export const getAvailableUserSources = (
    trigger: Triggerable,
    userSources: WiredSourceOption[],
    currentUserSource: number,
    usersTitle = 'wiredfurni.params.sources.users.title',
    allowClickedUserSource = true,
    stackSources: { clickedUser: boolean; reachedUser: boolean } = getStackUserSources(trigger)
) => {
    if (!allowClickedUserSource || usersTitle === BOT_SOURCE_TITLE) return userSources;

    const extra: WiredSourceOption[] = [];

    if (stackSources.reachedUser) extra.push(REACHED_USER_SOURCE);
    if (stackSources.clickedUser) extra.push(CLICKED_USER_SOURCE);

    return insertAfterTrigger(userSources, extra);
};

export const useAvailableUserSources = (
    trigger: Triggerable,
    userSources: WiredSourceOption[] = USER_SOURCES,
    usersTitle = 'wiredfurni.params.sources.users.title',
    allowClickedUserSource = true
) => {
    const [stackSources, setStackSources] = useState({ clickedUser: false, reachedUser: false });

    const refreshStackSources = useCallback(() => {
        const next = getStackUserSources(trigger);

        setStackSources((previous) => (previous.clickedUser === next.clickedUser && previous.reachedUser === next.reachedUser ? previous : next));
    }, [trigger]);

    useEffect(() => {
        refreshStackSources();

        if (!trigger) return;

        const intervalId = window.setInterval(refreshStackSources, 1000);

        return () => window.clearInterval(intervalId);
    }, [refreshStackSources, trigger]);

    useOctaneEvent<RoomEngineObjectEvent>(
        [RoomEngineObjectEvent.ADDED, RoomEngineObjectEvent.REMOVED, RoomEngineObjectEvent.PLACED, RoomEngineObjectEvent.CONTENT_UPDATED],
        (event) => {
            if (!trigger) return;
            if (event.category !== RoomObjectCategory.FLOOR) return;

            const roomSession = GetRoomSession();
            const roomId = roomSession?.roomId ?? GetRoomEngine().activeRoomId;

            if (event.roomId !== roomId) return;

            refreshStackSources();
        },
        !!trigger
    );

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, () => {
        if (!trigger) return;

        refreshStackSources();
    });

    return useMemo(
        () => getAvailableUserSources(trigger, userSources, 0, usersTitle, allowClickedUserSource, stackSources),
        [allowClickedUserSource, stackSources, trigger, userSources, usersTitle]
    );
};

/** A stored source the list no longer offers stays shown, so reopening and saving the box keeps it. */
const keepStoredSource = (sources: WiredSourceOption[], fallback: WiredSourceOption[], stored: number) => {
    if (sources.some((option) => option.value === stored)) return sources;

    const option = fallback.find((candidate) => candidate.value === stored);

    return option ? [...sources, option] : sources;
};

export const WiredSourcesSelector: FC<WiredSourcesSelectorProps> = (props) => {
    const {
        showFurni = false,
        showUsers = false,
        furniSource = 0,
        userSource = 0,
        furniTitle = 'wiredfurni.params.sources.furni.title',
        usersTitle = 'wiredfurni.params.sources.users.title',
        furniSources: viewFurniSources = FURNI_SOURCES,
        userSources: viewUserSources = USER_SOURCES,
        furniSlot = 0,
        userSlot = 0,
        allowClickedUserSource = true,
        furniDetail = null,
        userDetail = null,
        onChangeFurni = null,
        onChangeUsers = null
    } = props;
    const { trigger = null } = useWired();
    const furniSources = useMemo(
        () => keepStoredSource(getServerSlotSources(trigger, 'furni', furniSlot, viewFurniSources), viewFurniSources, furniSource),
        [trigger, furniSlot, viewFurniSources, furniSource]
    );
    const userSources = useMemo(
        () => keepStoredSource(getServerSlotSources(trigger, 'users', userSlot, viewUserSources), viewUserSources, userSource),
        [trigger, userSlot, viewUserSources, userSource]
    );
    const availableUserSources = useAvailableUserSources(trigger, userSources, usersTitle, allowClickedUserSource);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(furniSources, 'furni'), [furniSources]);
    const orderedUserSources = useMemo(() => {
        if (usersTitle === BOT_SOURCE_TITLE) return [...availableUserSources];

        return sortWiredSourceOptions(availableUserSources, 'users');
    }, [availableUserSources, usersTitle]);

    useEffect(() => {
        if (!showUsers || !onChangeUsers) return;
        if (userSource !== CLICKED_USER_SOURCE_VALUE && userSource !== REACHED_USER_SOURCE_VALUE) return;
        if (availableUserSources.some((source) => source.value === userSource)) return;

        onChangeUsers(0);
    }, [availableUserSources, onChangeUsers, showUsers, userSource]);

    const furniIndex = Math.max(
        0,
        orderedFurniSources.findIndex((s) => s.value === furniSource)
    );
    const userIndex = Math.max(
        0,
        orderedUserSources.findIndex((s) => s.value === userSource)
    );

    const prevFurni = () => {
        const next = (furniIndex - 1 + orderedFurniSources.length) % orderedFurniSources.length;
        onChangeFurni && onChangeFurni(orderedFurniSources[next].value);
    };

    const nextFurni = () => {
        const next = (furniIndex + 1) % orderedFurniSources.length;
        onChangeFurni && onChangeFurni(orderedFurniSources[next].value);
    };

    const prevUsers = () => {
        const next = (userIndex - 1 + orderedUserSources.length) % orderedUserSources.length;
        onChangeUsers && onChangeUsers(orderedUserSources[next].value);
    };

    const nextUsers = () => {
        const next = (userIndex + 1) % orderedUserSources.length;
        onChangeUsers && onChangeUsers(orderedUserSources[next].value);
    };

    if (!showFurni && !showUsers) return null;

    return (
        <div className="flex flex-col gap-2">
            {showFurni && (
                <>
                    <Text bold>{LocalizeText(furniTitle)}</Text>
                    <div className="flex items-center gap-1">
                        <Button variant="primary" classNames={['octane-wired__picker-button']} className="px-2 py-1" onClick={prevFurni}>
                            <FaChevronLeft />
                        </Button>
                        <div className="flex min-w-0 flex-1 items-center justify-center octane-wired__picker-label">
                            <Text small className="text-center">
                                {LocalizeText(orderedFurniSources[furniIndex].label)}
                            </Text>
                        </div>
                        <Button variant="primary" classNames={['octane-wired__picker-button']} className="px-2 py-1" onClick={nextFurni}>
                            <FaChevronRight />
                        </Button>
                    </div>
                    {furniDetail && <div className="octane-wired__source-detail">{furniDetail}</div>}
                </>
            )}

            {showFurni && showUsers && <hr className="m-0 bg-dark" />}

            {showUsers && (
                <>
                    <Text bold>{LocalizeText(usersTitle)}</Text>
                    <div className="flex items-center gap-1">
                        <Button variant="primary" classNames={['octane-wired__picker-button']} className="px-2 py-1" onClick={prevUsers}>
                            <FaChevronLeft />
                        </Button>
                        <div className="flex min-w-0 flex-1 items-center justify-center octane-wired__picker-label">
                            <Text small className="text-center">
                                {LocalizeText(orderedUserSources[userIndex].label)}
                            </Text>
                        </div>
                        <Button variant="primary" classNames={['octane-wired__picker-button']} className="px-2 py-1" onClick={nextUsers}>
                            <FaChevronRight />
                        </Button>
                    </div>
                    {userDetail && <div className="octane-wired__source-detail">{userDetail}</div>}
                </>
            )}
        </div>
    );
};

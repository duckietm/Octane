import { GetSessionDataManager, RoomUnitChatStyleComposer, UserInfoDataParser, UserInfoEvent, UserSettingsEvent } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useUserDataSnapshot } from './useSessionSnapshots';

// Singleton source published through the Zustand-backed shared-hook bridge.
const useSessionInfoState = () => {
    const [userInfo, setUserInfo] = useState<UserInfoDataParser>(null);
    const [chatStyleId, setChatStyleId] = useState<number>(0);

    const updateChatStyleId = (styleId: number) => {
        setChatStyleId(styleId);

        SendMessageComposer(new RoomUnitChatStyleComposer(styleId));
    };

    const respectUser = (userId: number) => GetSessionDataManager().giveRespect(userId);
    const respectPet = (petId: number) => GetSessionDataManager().givePetRespect(petId);

    useMessageEvent<UserInfoEvent>(UserInfoEvent, (event) => {
        setUserInfo(event.getParser().userInfo);
    });

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, (event) => {
        setChatStyleId(event.getParser().chatType);
    });

    return { userInfo, chatStyleId, respectUser, respectPet, updateChatStyleId };
};

// Public surface. SessionDataManager already invalidates the
// snapshot on UserInfoEvent / FigureUpdateEvent / giveRespect /
// givePetRespect, so userFigure / respectsLeft / respectsPetLeft stay
// in sync without local useState mirrors.
export const useSessionInfo = () => {
    const shared = useSharedHook(useSessionInfoState);
    const userData = useUserDataSnapshot();

    return {
        ...shared,
        userFigure: userData.figure,
        userRespectRemaining: userData.respectsLeft,
        petRespectRemaining: userData.respectsPetLeft
    };
};

registerSharedHook(useSessionInfoState);

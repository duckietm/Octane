import {
    AddLinkEventTracker,
    GetSessionDataManager,
    ILinkEventTracker,
    NewUserExperienceGetGiftsComposer,
    NewUserExperienceGetGiftsSelection,
    NewUserExperienceGiftOfferMessageEvent,
    NewUserExperienceNotCompleteEvent,
    NewUserExperienceScriptProceedComposer,
    RemoveLinkEventTracker,
    RoomSessionEvent
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, INuxGiftSelection, INuxGiftStep, SendMessageComposer, selectNuxGift } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useNavigatorData } from '../navigator';

const isLobbyOfferAllowed = () => GetConfigurationValue<boolean>('nux.lobbies.enabled', false) && GetSessionDataManager().isRealNoob;

/**
 * AIR nux/HabboNuxDialogs: the "old user" gift offer (NewUserExperienceNotComplete), the gift
 * choice (NewUserExperienceGiftOffer) and the noob lobby offer (`nux/lobbyoffer/show`, or a while
 * after a real noob enters their home room).
 */
export const useNuxDialogs = () => {
    const [oldUserOffer, setOldUserOffer] = useState(false);
    const [giftSteps, setGiftSteps] = useState<INuxGiftStep[]>(null);
    const [giftStep, setGiftStep] = useState(0);
    const [giftSelections, setGiftSelections] = useState<INuxGiftSelection[]>([]);
    const [lobbyOffer, setLobbyOffer] = useState(false);
    const lobbyTimerRef = useRef<number>(0);
    const { navigatorData = null } = useNavigatorData();
    const homeRoomIdRef = useRef(0);

    homeRoomIdRef.current = navigatorData?.homeRoomId ?? 0;

    const clearLobbyTimer = () => {
        if (lobbyTimerRef.current) window.clearTimeout(lobbyTimerRef.current);

        lobbyTimerRef.current = 0;
    };

    /** createNoobRoomOfferView / destroyNoobRoomOfferView. */
    const showLobbyOffer = () => {
        if (!isLobbyOfferAllowed()) return;

        clearLobbyTimer();
        setLobbyOffer(true);
    };

    const hideLobbyOffer = () => {
        clearLobbyTimer();
        setLobbyOffer(false);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts[1] !== 'lobbyoffer') return;

                if (parts[2] === 'show') showLobbyOffer();
                else hideLobbyOffer();
            },
            eventUrlPrefix: 'nux/'
        };

        AddLinkEventTracker(linkTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            clearLobbyTimer();
        };
    }, []);

    // _r2e8ee6747a8a2b: a real noob in their home room is offered the lobby after a while.
    useOctaneEvent<RoomSessionEvent>([RoomSessionEvent.CREATED, RoomSessionEvent.ENDED], (event) => {
        if (!isLobbyOfferAllowed()) return;

        if (event.type === RoomSessionEvent.CREATED && event.session && event.session.roomId === homeRoomIdRef.current) {
            clearLobbyTimer();
            lobbyTimerRef.current = window.setTimeout(showLobbyOffer, GetConfigurationValue<number>('nux.noob.lobby.popup.delay', 70) * 1000);
            return;
        }

        hideLobbyOffer();
    });

    useMessageEvent<NewUserExperienceNotCompleteEvent>(NewUserExperienceNotCompleteEvent, () => setOldUserOffer(true));

    useMessageEvent<NewUserExperienceGiftOfferMessageEvent>(NewUserExperienceGiftOfferMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !parser.giftOptions?.length) return;

        setGiftSteps(
            parser.giftOptions.map((step) => ({
                dayIndex: step.dayIndex,
                stepIndex: step.stepIndex,
                options: step.options.map((option) => ({
                    thumbnailUrl: option.thumbnailUrl,
                    products: option.productOfferList.map((product) => ({ itemName: product.itemName, extraInfo: product.extraInfo }))
                }))
            }))
        );
        setGiftStep(0);
        setGiftSelections([]);
    });

    /** NuxOfferOldUserView btnGo: "verify and get gifts" moves the script on. */
    const acceptOldUserOffer = () => {
        setOldUserOffer(false);
        SendMessageComposer(new NewUserExperienceScriptProceedComposer(NewUserExperienceScriptProceedComposer.VERIFY));
    };

    /** The "never again" confirmation ends the script for good. */
    const neverAgainOldUserOffer = () => {
        setOldUserOffer(false);
        SendMessageComposer(new NewUserExperienceScriptProceedComposer(NewUserExperienceScriptProceedComposer.NEVER_AGAIN));
    };

    const selectGift = (giftIndex: number) => {
        if (!giftSteps) return;

        const result = selectNuxGift(giftSteps, giftStep, giftSelections, giftIndex);

        if (result.done) {
            SendMessageComposer(
                new NewUserExperienceGetGiftsComposer(
                    ...result.selections.map((selection) => new NewUserExperienceGetGiftsSelection(selection.dayIndex, selection.stepIndex, selection.giftIndex))
                )
            );
            setGiftSteps(null);
            setGiftSelections([]);
            setGiftStep(0);
            return;
        }

        setGiftSelections(result.selections);
        setGiftStep(result.current);
    };

    return {
        oldUserOffer,
        acceptOldUserOffer,
        neverAgainOldUserOffer,
        giftSteps,
        giftStep,
        selectGift,
        lobbyOffer,
        hideLobbyOffer
    };
};

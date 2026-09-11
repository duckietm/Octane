import {
    AddLinkEventTracker,
    CreateLinkEvent,
    GetSessionDataManager,
    ILinkEventTracker,
    NewUserExperienceGetGiftsComposer,
    NewUserExperienceGetGiftsSelection,
    NewUserExperienceGiftOfferMessageEvent,
    NewUserExperienceGiftOptions,
    NewUserExperienceNotCompleteEvent,
    NewUserExperienceScriptProceedComposer,
    RemoveLinkEventTracker,
    RoomEntryInfoMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, GetRoomSession, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useMessageEvent, useNavigatorData, useNotification } from '../../hooks';
import {
    NuxGiftSelection,
    resolveNuxGiftOptionName,
    resolveNuxGiftSeparator,
    resolveNuxGiftTitle,
    selectNuxGiftOption,
    shouldOfferNoobLobby
} from './nuxGifts';

const lookupText = (key: string): string => LocalizeText(key);

/**
 * The official new user experience dialogs (HabboNuxDialogs):
 * - `nux_offer_old_user` when the server says the NUX script is not complete
 *   (verify -> script proceed, skip -> "never again" confirmation);
 * - `nux_gift_selection`, one step at a time, sending every choice together;
 * - `nux_noob_room_offer`, the newbie lobby invitation shown a while after a
 *   real newbie enters the home room (or through `nux/lobbyoffer/show`).
 *
 * The official script-proceed packet carries the reason: 0 from "Verify & get
 * gifts" and 2 from the "never again" confirmation.
 */
export const NuxView: FC<{}> = () => {
    const [offerVisible, setOfferVisible] = useState(false);
    const [lobbyOfferVisible, setLobbyOfferVisible] = useState(false);
    const [giftSteps, setGiftSteps] = useState<NewUserExperienceGiftOptions[]>([]);
    const [giftStep, setGiftStep] = useState(0);
    const [giftSelections, setGiftSelections] = useState<NuxGiftSelection[]>([]);
    const lobbyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const { navigatorData = null } = useNavigatorData();
    const { showConfirm = null } = useNotification();

    const clearLobbyTimer = useCallback(() => {
        if (!lobbyTimerRef.current) return;

        clearTimeout(lobbyTimerRef.current);
        lobbyTimerRef.current = null;
    }, []);

    const closeLobbyOffer = useCallback(() => {
        clearLobbyTimer();
        setLobbyOfferVisible(false);
    }, [clearLobbyTimer]);

    useMessageEvent<NewUserExperienceNotCompleteEvent>(NewUserExperienceNotCompleteEvent, () => setOfferVisible(true));

    useMessageEvent<NewUserExperienceGiftOfferMessageEvent>(NewUserExperienceGiftOfferMessageEvent, (event) => {
        const parser = event.getParser();

        setGiftSteps(parser.giftOptions ?? []);
        setGiftStep(0);
        setGiftSelections([]);
    });

    // HabboNuxDialogs.onRoomSessionEvent: entering the home room arms the lobby offer timer.
    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, () => {
        const gate = {
            lobbiesEnabled: !!GetConfigurationValue<boolean>('nux.lobbies.enabled', false),
            isRealNoob: !!GetSessionDataManager().isRealNoob,
            roomId: GetRoomSession()?.roomId ?? 0,
            homeRoomId: navigatorData?.homeRoomId ?? 0
        };

        if (!shouldOfferNoobLobby(gate)) {
            closeLobbyOffer();
            return;
        }

        clearLobbyTimer();
        lobbyTimerRef.current = setTimeout(() => {
            lobbyTimerRef.current = null;
            setLobbyOfferVisible(true);
        }, GetConfigurationValue<number>('nux.noob.lobby.popup.delay', 70) * 1000);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2 || parts[1] !== 'lobbyoffer') return;

                if (parts[2] === 'show') {
                    if (GetConfigurationValue<boolean>('nux.lobbies.enabled', false) && GetSessionDataManager().isRealNoob) setLobbyOfferVisible(true);
                } else {
                    closeLobbyOffer();
                }
            },
            eventUrlPrefix: 'nux/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [closeLobbyOffer]);

    useEffect(() => () => clearLobbyTimer(), [clearLobbyTimer]);

    const onVerify = () => {
        SendMessageComposer(new NewUserExperienceScriptProceedComposer(NewUserExperienceScriptProceedComposer.VERIFY));
        setOfferVisible(false);
    };

    const onReject = () => {
        showConfirm?.(
            localizeWithFallback('phone.number.never.again.confirm.text', 'Are you sure you never want to see this offer again?'),
            () => {
                setOfferVisible(false);
                SendMessageComposer(new NewUserExperienceScriptProceedComposer(NewUserExperienceScriptProceedComposer.NEVER_AGAIN));
            },
            null,
            null,
            null,
            localizeWithFallback('phone.number.never.again.confirm.title', 'Never again?')
        );
    };

    const onSelectGift = (giftIndex: number) => {
        const result = selectNuxGiftOption(giftSteps, giftSelections, giftStep, giftIndex);

        if (result.complete) {
            SendMessageComposer(
                new NewUserExperienceGetGiftsComposer(
                    ...result.selections.map((entry) => new NewUserExperienceGetGiftsSelection(entry.dayIndex, entry.stepIndex, entry.giftIndex))
                )
            );
            setGiftSteps([]);
            setGiftSelections([]);
            setGiftStep(0);
            return;
        }

        setGiftSelections(result.selections);
        setGiftStep(result.nextStep);
    };

    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const popupTitle = localizeWithFallback('notification.notification.nux.popup.title', 'Welcome to Habbo');
    const currentGiftStep = giftSteps[giftStep] ?? null;
    const separator = resolveNuxGiftSeparator(lookupText);

    return (
        <>
            {offerVisible && (
                <OctaneCardView className="octane-nux-offer w-[456px]" theme="primary-slim" uniqueKey="nux-offer-old-user" isResizable={false}>
                    <OctaneCardHeaderView headerText={popupTitle} onCloseClick={onReject} />
                    <OctaneCardContentView className="text-black">
                        <div className="octane-nux-offer__body">
                            <div className="octane-nux-offer__hero">
                                <img src={`${imageLibraryUrl}nux/nux_cropped_frank.png`} alt="" className="octane-nux-offer__frank" />
                                <div className="flex flex-col gap-1">
                                    <p className="octane-nux-offer__title">
                                        {localizeWithFallback('nux.offer.old.user.title', 'Would you like to get some gifts?')}
                                    </p>
                                    <p className="octane-nux-offer__summary">{localizeWithFallback('nux.offer.old.user.summary', '')}</p>
                                </div>
                            </div>
                            <div className="octane-nux-offer__buttons">
                                <button type="button" className="octane-nux-offer__skip" onClick={onReject}>
                                    {localizeWithFallback('nux.offer.old.user.button.skip', 'No, thanks!')}
                                </button>
                                <button type="button" className="habbo-btn-green habbo-btn-green--auto octane-nux-offer__go" onClick={onVerify}>
                                    {localizeWithFallback('nux.offer.old.user.button.verify', 'Verify & get gifts')}
                                </button>
                            </div>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
            {currentGiftStep && (
                <OctaneCardView className="octane-nux-gifts w-[487px]" theme="primary-slim" uniqueKey="nux-gift-selection" isResizable={false}>
                    <OctaneCardHeaderView
                        headerText={resolveNuxGiftTitle(localizeWithFallback('nux.gift.selection.title', 'Choose gift option'), giftStep, giftSteps.length)}
                        onCloseClick={() => {
                            setGiftSteps([]);
                            setGiftSelections([]);
                            setGiftStep(0);
                        }}
                    />
                    <OctaneCardContentView className="text-black">
                        <div className="flex items-center gap-3">
                            <i className="octane-icon icon-hc-banner shrink-0" aria-hidden="true" />
                            <p className="octane-nux-gifts__heading flex-1">{localizeWithFallback('nux.gift.selection.choose.one', 'Get your free gift!')}</p>
                        </div>
                        <div className="octane-nux-gifts__list">
                            {currentGiftStep.options.map((gift, index) => (
                                <div key={index} className="octane-nux-gifts__option">
                                    <div className="octane-nux-gifts__thumbnail">
                                        {gift.thumbnailUrl && <img src={`${imageLibraryUrl}${gift.thumbnailUrl}`} alt="" />}
                                    </div>
                                    <div className="octane-nux-gifts__name">{resolveNuxGiftOptionName(gift, lookupText, separator)}</div>
                                    <button
                                        type="button"
                                        className="habbo-btn-green habbo-btn-green--auto octane-nux-gifts__button"
                                        onClick={() => onSelectGift(index)}
                                    >
                                        {localizeWithFallback('nux.gift.selection.button.get', 'Get this')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
            {lobbyOfferVisible && (
                <OctaneCardView
                    className="octane-nux-lobby-offer w-[382px] !left-[20px] !top-[20px]"
                    theme="primary-slim"
                    uniqueKey="nux-noob-room-offer"
                    isResizable={false}
                >
                    <OctaneCardHeaderView headerText={popupTitle} onCloseClick={closeLobbyOffer} />
                    <OctaneCardContentView className="text-black">
                        <div className="octane-nux-offer__body">
                            <div className="flex justify-center">
                                <img src={`${imageLibraryUrl}nux/NUXroom_prompt.png`} alt="" className="octane-nux-offer__lobby-image" />
                            </div>
                            <p className="octane-nux-offer__summary">
                                {localizeWithFallback('nux.offer.noob.lobby.summary', 'Enter a room to meet other new users.')}
                            </p>
                            <div className="octane-nux-offer__buttons">
                                <button
                                    type="button"
                                    className="habbo-btn-green habbo-btn-green--auto octane-nux-offer__go"
                                    onClick={() => {
                                        CreateLinkEvent('navigator/goto/predefined_noob_lobby');
                                        closeLobbyOffer();
                                    }}
                                >
                                    {localizeWithFallback('nux.offer.noob.lobby.button', 'Enter the room!')}
                                </button>
                            </div>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
        </>
    );
};
